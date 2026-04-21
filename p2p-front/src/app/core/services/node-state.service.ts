import { Injectable, inject, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';
import { P2pApiService } from './p2p-api.service';
import { ActivityService } from './activity.service';
import { NodeHealth, P2pNode } from '../models';

@Injectable({ providedIn: 'root' })
export class NodeStateService {
  private api      = inject(P2pApiService);
  private activity = inject(ActivityService);

  readonly nodes: P2pNode[] = environment.nodes;

  /**
   * FIX : on initialise _health avec un état "inconnu" pour chaque noeud.
   * Ainsi isOnline() retourne false (pas "hors ligne") jusqu'au premier ping,
   * au lieu d'afficher "hors ligne" de façon trompeuse.
   */
  private _health = signal<Record<string, NodeHealth>>(
    Object.fromEntries(
      environment.nodes.map(n => [
        n.id,
        { nodeId: n.id, online: false, lastChecked: null as any, responseTimeMs: undefined, pending: true }
      ])
    )
  );

  readonly health = this._health.asReadonly();

  readonly onlineCount = computed(() =>
    Object.values(this._health()).filter(h => h.online).length
  );

  /**
   * FIX : isPending() permet au template d'afficher "..." au lieu de "Hors ligne"
   * quand le premier ping n'a pas encore eu lieu.
   */
  isPending(nodeId: string): boolean {
    return (this._health()[nodeId] as any)?.pending === true;
  }

  isOnline(nodeId: string): boolean {
    return this._health()[nodeId]?.online ?? false;
  }

  pingAll(): void {
    this.nodes.forEach(node => {
      this.api.pingNode(node).subscribe({
        next: result => {
          this._health.update(h => ({
            ...h,
            [node.id]: {
              nodeId: node.id,
              online: result.online,
              lastChecked: new Date(),
              responseTimeMs: result.responseTimeMs,
              pending: false   // FIX : ping terminé, plus "pending"
            }
          }));
        },
        error: () => {
          this._health.update(h => ({
            ...h,
            [node.id]: {
              nodeId: node.id,
              online: false,
              lastChecked: new Date(),
              responseTimeMs: undefined,
              pending: false
            }
          }));
        }
      });
    });
  }

  getNodeById(id: string): P2pNode | undefined {
    return this.nodes.find(n => n.id === id);
  }

  getPeerNodes(nodeId: string): P2pNode[] {
    return this.nodes.filter(n => n.id !== nodeId);
  }
}
