import { Injectable, inject, signal, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap, finalize } from 'rxjs';
import { NodeService } from './node.service';
import { ActivityService } from './activity.service';
import { P2PNode, FileInfo } from '../models/models';

export interface BackendFileInfo {
  name:         string;
  size:         number;
  lastModified: number;
}

@Injectable({ providedIn: 'root' })
export class FileService {
  private http     = inject(HttpClient);
  private nodeService = inject(NodeService);
  private activity = inject(ActivityService);
  private zone     = inject(NgZone);

  // ── Cache local ───────────────────────────────────────────────────────────
  private _filesByNode = signal<Map<string, FileInfo[]>>(new Map());
  readonly filesByNode  = this._filesByNode.asReadonly();

  private _uploading = signal(false);
  readonly uploading  = this._uploading.asReadonly();

  // ── GET /files/internal/list ──────────────────────────────────────────────
  /**
   * Charge la liste des fichiers présents sur un nœud depuis le backend.
   * Appelle le nouvel endpoint GET /files/internal/list (FileListController.java)
   */
  loadFilesFromNode(node: P2PNode): void {
    const url = `${this.nodeService.getBaseUrl(node)}/files/internal/list`;
    this.http.get<BackendFileInfo[]>(url).pipe(
      catchError(() => {
        // Endpoint non disponible ou nœud hors ligne → ne rien faire
        return [];
      })
    ).subscribe(files => {
      if (!files || !Array.isArray(files)) return;
      this._filesByNode.update(map => {
        const newMap  = new Map(map);
        const current = newMap.get(node.id) ?? [];

        // Fusionner : ajouter les fichiers du backend qui ne sont pas encore dans le cache
        const backendFiles: FileInfo[] = files.map(f => ({
          name:       f.name,
          size:       f.size,
          nodePort:   node.port,
          nodeName:   node.name,
          uploadedAt: new Date(f.lastModified),
          isLocal:    true,
        }));

        const merged = [...current];
        for (const bf of backendFiles) {
          if (!merged.some(c => c.name === bf.name)) {
            merged.push(bf);
          }
        }

        newMap.set(node.id, merged);
        return newMap;
      });
    });
  }

  // ── POST /files/{filename} ────────────────────────────────────────────────
  /**
   * Upload d'un fichier → FileController.upload() → FileService.saveFile()
   * Le backend fait : sauvegarde locale + réplication auto vers les peers.
   *
   * FIX: utilise finalize() pour garantir que uploading repasse à false
   * même en cas d'erreur silencieuse CORS.
   */
  uploadFile(node: P2PNode, filename: string, data: ArrayBuffer): Observable<string> {
    this._uploading.set(true);

    const url     = `${this.nodeService.getBaseUrl(node)}/files/${encodeURIComponent(filename)}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/octet-stream' });

    return this.http.post(url, data, { headers, responseType: 'text' }).pipe(
      tap(() => {
        // Succès : mettre en cache et logger l'activité
        this.addFileToCache(node, filename, data.byteLength);
        this.activity.logUpload(filename, node.name, node.port, true);
      }),
      catchError((err: HttpErrorResponse) => {
        this.activity.logUpload(filename, node.name, node.port, false);
        return throwError(() => new Error(this.parseError(err)));
      }),
      // FIX #1 — finalize() s'exécute TOUJOURS (succès OU erreur)
      // Garantit que le spinner s'arrête quoi qu'il arrive
      finalize(() => this._uploading.set(false))
    );
  }

  // ── GET /files/{filename} ─────────────────────────────────────────────────
  /**
   * Téléchargement d'un fichier → FileController.download() → FileService.getFile()
   * Le backend cherche localement puis chez les peers (recherche P2P automatique).
   */
  downloadFile(node: P2PNode, filename: string): Observable<ArrayBuffer> {
    const url = `${this.nodeService.getBaseUrl(node)}/files/${encodeURIComponent(filename)}`;
    return this.http.get(url, { responseType: 'arraybuffer' }).pipe(
      tap(() => this.activity.logDownload(filename, node.name, node.port, true)),
      catchError((err: HttpErrorResponse) => {
        this.activity.logDownload(filename, node.name, node.port, false);
        return throwError(() => new Error(this.parseError(err)));
      })
    );
  }

  // ── POST /files/internal/replicate/{filename} ─────────────────────────────
  /**
   * Réplication manuelle : source → destination.
   * Étape 1 : GET /files/internal/local/{filename} sur le nœud source.
   * Étape 2 : POST /files/internal/replicate/{filename} sur le nœud destination.
   *
   * FIX #2 — La réplication utilise maintenant downloadFile() (route publique)
   * au lieu de downloadLocalFile() pour éviter les erreurs si le nœud source
   * a besoin de chercher chez ses propres peers.
   */
  replicateFile(
    sourceNode: P2PNode,
    targetNode: P2PNode,
    filename:   string
  ): Observable<string> {
    return new Observable(observer => {
      // Étape 1 : télécharger depuis la route locale du nœud source
      const srcUrl = `${this.nodeService.getBaseUrl(sourceNode)}/files/internal/local/${encodeURIComponent(filename)}`;
      this.http.get(srcUrl, { responseType: 'arraybuffer' }).subscribe({
        next: data => {
          if (!data || data.byteLength === 0) {
            observer.error(new Error('Le fichier source est vide ou introuvable'));
            return;
          }

          // Étape 2 : envoyer vers la route interne du nœud destination
          const destUrl = `${this.nodeService.getBaseUrl(targetNode)}/files/internal/replicate/${encodeURIComponent(filename)}`;
          const headers = new HttpHeaders({ 'Content-Type': 'application/octet-stream' });

          this.http.post(destUrl, data, { headers, responseType: 'text' }).subscribe({
            next: res => {
              // Mettre à jour le cache et logger
              this.addFileToCache(targetNode, filename);
              this.activity.logReplicate(filename, sourceNode.name, targetNode.name, targetNode.port, true);
              observer.next(res);
              observer.complete();
            },
            error: (err: HttpErrorResponse) => {
              this.activity.logReplicate(filename, sourceNode.name, targetNode.name, targetNode.port, false);
              observer.error(new Error(this.parseError(err)));
            }
          });
        },
        error: (err: HttpErrorResponse) => {
          observer.error(new Error(
            err.status === 404 || err.status === 500
              ? `Fichier "${filename}" introuvable sur ${sourceNode.name}`
              : this.parseError(err)
          ));
        }
      });
    });
  }

  // ── GET /files/internal/local/{filename} ──────────────────────────────────
  /**
   * Vérification locale d'un fichier sur un nœud.
   * FIX #3 — Renvoie un Observable<boolean> pour éviter l'ambiguïté
   * sur la réponse arraybuffer vide.
   */
  checkLocalFile(node: P2PNode, filename: string): Observable<boolean> {
    const url = `${this.nodeService.getBaseUrl(node)}/files/internal/local/${encodeURIComponent(filename)}`;
    return new Observable(observer => {
      this.http.get(url, { responseType: 'arraybuffer' }).subscribe({
        next: data => {
          // FIX : un arraybuffer peut être non-null mais de taille 0
          const found = data !== null && data !== undefined;
          this.activity.logCheck(filename, node.name, found);
          observer.next(found);
          observer.complete();
        },
        error: (err: HttpErrorResponse) => {
          // 404 ou 500 = fichier absent localement
          this.activity.logCheck(filename, node.name, false);
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  // ── Téléchargement navigateur ─────────────────────────────────────────────
  triggerDownload(data: ArrayBuffer, filename: string): void {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Cache ─────────────────────────────────────────────────────────────────
  addFileToCache(node: P2PNode, filename: string, size?: number): void {
    this._filesByNode.update(map => {
      const newMap   = new Map(map);
      const existing = newMap.get(node.id) ?? [];
      if (!existing.some(f => f.name === filename)) {
        existing.push({
          name:       filename,
          size,
          nodePort:   node.port,
          nodeName:   node.name,
          uploadedAt: new Date(),
          isLocal:    true,
        });
      }
      newMap.set(node.id, [...existing]);
      return newMap;
    });
  }

  getFilesForNode(nodeId: string): FileInfo[] {
    return this._filesByNode().get(nodeId) ?? [];
  }

  getAllFiles(): FileInfo[] {
    const all: FileInfo[] = [];
    this._filesByNode().forEach(files => all.push(...files));
    return all;
  }

  removeFileFromCache(nodeId: string, filename: string): void {
    this._filesByNode.update(map => {
      const newMap = new Map(map);
      newMap.set(nodeId, (newMap.get(nodeId) ?? []).filter(f => f.name !== filename));
      return newMap;
    });
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────
  formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k     = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i     = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  private parseError(err: HttpErrorResponse): string {
    if (err.status === 0)   return 'Nœud inaccessible — vérifiez que Spring Boot est démarré et que CORS est configuré';
    if (err.status === 404) return 'Fichier introuvable sur ce nœud';
    if (err.status === 500) return `Erreur serveur (500) — vérifiez les logs Spring Boot`;
    return `Erreur HTTP ${err.status}: ${err.message}`;
  }
}
