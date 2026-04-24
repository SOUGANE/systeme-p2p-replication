import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of, timeout } from 'rxjs';
import { P2PNode, NodeStats } from '../models/models';
import { ActivityService } from './activity.service';

@Injectable({ providedIn: 'root' })
export class NodeService {
  private http     = inject(HttpClient);
  private activity = inject(ActivityService);

  readonly _nodes = signal<P2PNode[]>([
    { id: 'node-a', name: 'Node A', host: 'localhost', port: 5000, status: 'checking', isActive: true,  filesCount: 0 },
    { id: 'node-b', name: 'Node B', host: 'localhost', port: 5001, status: 'checking', isActive: false, filesCount: 0 },
    { id: 'node-c', name: 'Node C', host: 'localhost', port: 5002, status: 'checking', isActive: false, filesCount: 0 },
  ]);

  readonly nodes     = this._nodes.asReadonly();
  readonly activeNode = computed(() => this._nodes().find(n => n.isActive) ?? this._nodes()[0]);

  readonly stats = computed<NodeStats>(() => {
    const nodes = this._nodes();
    return {
      totalNodes:      nodes.length,
      onlineNodes:     nodes.filter(n => n.status === 'online').length,
      offlineNodes:    nodes.filter(n => n.status === 'offline').length,
      totalFiles:      nodes.reduce((acc, n) => acc + (n.filesCount ?? 0), 0),
      replicatedFiles: 0,
    };
  });

  getBaseUrl(node: P2PNode): string {
    return `http://${node.host}:${node.port}`;
  }

  getActiveBaseUrl(): string {
    return this.getBaseUrl(this.activeNode());
  }

  setActiveNode(nodeId: string): void {
    this._nodes.update(nodes => nodes.map(n => ({ ...n, isActive: n.id === nodeId })));
  }

  addNode(name: string, host: string, port: number): void {
    const newNode: P2PNode = {
      id: `node-${Date.now()}`, name, host, port,
      status: 'checking', isActive: false, filesCount: 0,
    };
    this._nodes.update(nodes => [...nodes, newNode]);
    this.pingNode(newNode.id);
  }

  removeNode(nodeId: string): void {
    this._nodes.update(nodes => {
      const filtered  = nodes.filter(n => n.id !== nodeId);
      const wasActive = nodes.find(n => n.id === nodeId)?.isActive;
      if (wasActive && filtered.length > 0) filtered[0] = { ...filtered[0], isActive: true };
      return filtered;
    });
  }

  updateFilesCount(nodeId: string, count: number): void {
    this._nodes.update(nodes => nodes.map(n => n.id === nodeId ? { ...n, filesCount: count } : n));
  }

  /**
   * Ping un nœud via GET /ping (PingController.java).
   * FIX: logue les changements d'état online/offline dans ActivityService.
   */
  pingNode(nodeId: string, onOnline?: (node: P2PNode) => void): void {
    const node = this._nodes().find(n => n.id === nodeId);
    if (!node) return;

    const prevStatus = node.status;

    // Marquer comme "en vérification"
    this._nodes.update(nodes =>
      nodes.map(n => n.id === nodeId ? { ...n, status: 'checking' } : n)
    );

    this.http.get<{ status: string }>(`${this.getBaseUrl(node)}/ping`).pipe(
      timeout(3000),
      catchError((err: HttpErrorResponse) => {
        // Si on reçoit une réponse HTTP (même erreur), le serveur est accessible
        if (err.status && err.status > 0) {
          return of({ status: 'online' });
        }
        return of(null);
      })
    ).subscribe(response => {
      const isOnline = response !== null;

      // Logger le changement d'état dans l'activité si c'est nouveau
      if (isOnline && prevStatus !== 'online') {
        this.activity.logNodeOnline(node.name, node.port);
        // Callback pour charger les fichiers quand un nœud vient en ligne
        onOnline?.(node);
      } else if (!isOnline && prevStatus === 'online') {
        this.activity.logNodeOffline(node.name, node.port);
      }

      this._nodes.update(nodes =>
        nodes.map(n => n.id === nodeId
          ? { ...n, status: isOnline ? 'online' : 'offline', lastChecked: new Date() }
          : n
        )
      );
    });
  }

  pingAllNodes(onOnline?: (node: P2PNode) => void): void {
    this._nodes().forEach(node => this.pingNode(node.id, onOnline));
  }
}
