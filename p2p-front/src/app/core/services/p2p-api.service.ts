import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { P2pNode, FileCheckResult } from '../models';

@Injectable({ providedIn: 'root' })
export class P2pApiService {
  private http = inject(HttpClient);

  /** POST /files/{filename} — upload + réplication auto vers les peers */
  uploadFile(node: P2pNode, filename: string, data: ArrayBuffer): Observable<string> {
    const url = `${node.proxyPrefix}/files/${encodeURIComponent(filename)}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/octet-stream' });
    return this.http.post(url, data, { headers, responseType: 'text' });
  }

  /** GET /files/{filename} — download (local d'abord, puis peers) */
  downloadFile(node: P2pNode, filename: string): Observable<Blob> {
    const url = `${node.proxyPrefix}/files/${encodeURIComponent(filename)}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  /** GET /files/internal/local/{filename} — vérification locale uniquement */
  checkFileLocal(node: P2pNode, filename: string): Observable<FileCheckResult> {
    const url = `${node.proxyPrefix}/files/internal/local/${encodeURIComponent(filename)}`;
    return this.http.get(url, { responseType: 'blob' }).pipe(
      timeout(4000),
      map(() => ({ nodeId: node.id, nodeLabel: node.label, hasFile: true, checkedAt: new Date() })),
      catchError(() => of({ nodeId: node.id, nodeLabel: node.label, hasFile: false, checkedAt: new Date() }))
    );
  }

  /** POST /files/internal/replicate/{filename} — réplication manuelle */
  replicateFile(node: P2pNode, filename: string, data: ArrayBuffer): Observable<string> {
    const url = `${node.proxyPrefix}/files/internal/replicate/${encodeURIComponent(filename)}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/octet-stream' });
    return this.http.post(url, data, { headers, responseType: 'text' });
  }

  /**
   * Health check du noeud.
   *
   * STRATÉGIE :
   * On essaie de lire un fichier qui n'existe pas ("healthcheck.ping").
   * Spring Boot retourne :
   *   - 500 RuntimeException  → noeud UP  (il a reçu la requête et traité)
   *   - 404 (si jamais)       → noeud UP  (idem)
   *   - ECONNREFUSED          → noeud DOWN (connexion refusée = pas démarré)
   *   - Timeout               → noeud DOWN
   */
  pingNode(node: P2pNode): Observable<{ online: boolean; responseTimeMs: number }> {
    const start = Date.now();
    // On utilise un nom de fichier valide (sans caractères spéciaux rejetés par validateFilename)
    const url = `${node.proxyPrefix}/files/internal/local/healthcheck.ping`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      timeout(4000),
      map(() => ({ online: true, responseTimeMs: Date.now() - start })),
      catchError(err => {
        const ms = Date.now() - start;
        // 500 = noeud UP (fichier introuvable, RuntimeException lancée par Spring Boot)
        // 404 = noeud UP (cas possible)
        // 0 ou ECONNREFUSED = noeud DOWN
        const httpStatus = err?.status ?? 0;
        const online = httpStatus === 500 || httpStatus === 404;
        return of({ online, responseTimeMs: ms });
      })
    );
  }
}
