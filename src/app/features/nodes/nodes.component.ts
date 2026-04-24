import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../core/services/node.service';
import { ToastService } from '../../core/services/toast.service';
import { P2PNode } from '../../core/models/models';

@Component({
  selector: 'app-nodes',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="nodes-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Gestion des nœuds</h1>
          <p>Ajoutez, supprimez et surveillez les nœuds du réseau P2P.</p>
        </div>
        <button class="btn btn-secondary" (click)="pingAll()">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
          </svg>
          Pinger tous
        </button>
      </div>

      <!-- Add Node Panel -->
      <!-- <div class="card add-node-panel animate-fade-in-up">
        <div class="card-header">
          <h3>➕ Ajouter un nœud</h3>
        </div>
        <div class="card-body">
          <div class="add-form">
            <div class="form-group">
              <label>Nom du nœud</label>
              <input [(ngModel)]="newNode().name" placeholder="ex: Node D" type="text"/>
            </div>
            <div class="form-group">
              <label>Hôte</label>
              <input [(ngModel)]="newNode().host" placeholder="localhost" type="text"/>
            </div>
            <div class="form-group">
              <label>Port</label>
              <input [(ngModel)]="newNode().port" placeholder="5003" type="number" min="1024" max="65535"/>
            </div>
            <button class="btn btn-primary" (click)="addNode()" [disabled]="!isFormValid()">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"/>
              </svg>
              Ajouter
            </button>
          </div>
          <p class="hint-text">
            💡 Simulez plusieurs nœuds en lançant l'application Spring Boot sur des ports différents (ex: 5000, 5001, 5002…)
          </p>
        </div>
      </div> -->

      <!-- Nodes List -->
      <div class="nodes-list animate-fade-in-up" style="animation-delay:100ms">
        @for (node of nodeService.nodes(); track node.id) {
          <div class="node-row" [class.node-row--active]="node.isActive">
            <!-- Status dot -->
            <div class="nr-status">
              <div class="status-dot"
                [class.online]="node.status === 'online'"
                [class.offline]="node.status === 'offline'"
                [class.checking]="node.status === 'checking'">
              </div>
            </div>

            <!-- Node info -->
            <div class="nr-info">
              <div class="nr-name">
                {{ node.name }}
                @if (node.isActive) {
                  <span class="active-badge">Nœud actif</span>
                }
              </div>
              <div class="nr-address mono">{{ node.host }}:{{ node.port }}</div>
            </div>

            <!-- Status badge -->
            <div class="nr-badge">
              @switch (node.status) {
                @case ('online')   { <span class="badge badge--online">En ligne</span> }
                @case ('offline')  { <span class="badge badge--offline">Hors ligne</span> }
                @case ('checking') {
                  <span class="badge badge--warning">
                    <span class="spinner-sm"></span> Vérification
                  </span>
                }
              }
            </div>

            <!-- Last checked -->
            <div class="nr-time mono">
              @if (node.lastChecked) {
                {{ formatTime(node.lastChecked) }}
              } @else {
                —
              }
            </div>

            <!-- Actions -->
            <div class="nr-actions">
              @if (!node.isActive) {
                <button class="btn btn-sm btn-teal" (click)="setActive(node)" title="Définir comme nœud actif">
                  Définir actif
                </button>
              }
              <button class="btn btn-sm btn-secondary" (click)="pingNode(node)" title="Pinger ce nœud">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
                </svg>
                Ping
              </button>
              <button class="btn btn-sm btn-danger" (click)="removeNode(node)" title="Supprimer ce nœud">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- API Reference -->
      <div class="api-reference card animate-fade-in-up" style="animation-delay:200ms">
        <div class="card-header">
          <h3>📡 Référence API Backend</h3>
        </div>
        <div class="card-body">
          <div class="api-grid">
            @for (route of apiRoutes; track route.method + route.path) {
              <div class="api-route">
                <span class="method-badge" [class]="'method-' + route.method.toLowerCase()">{{ route.method }}</span>
                <span class="route-path mono">/files{{ route.path }}</span>
                <span class="route-desc">{{ route.description }}</span>
                <span class="route-access badge" [class]="route.internal ? 'badge--warning' : 'badge--info'">
                  {{ route.internal ? 'Interne' : 'Public' }}
                </span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nodes-page {
      padding: 36px 40px;
      max-width: 1100px;
    }

    .add-node-panel {
      margin-bottom: 24px;
    }
    .add-form {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      flex-wrap: wrap;
    }
    .add-form .form-group {
      flex: 1;
      min-width: 140px;
    }
    .hint-text {
      margin-top: 14px;
      font-size: 12.5px;
      color: var(--text-muted);
      background: rgba(242,169,59,0.07);
      border: 1px solid rgba(242,169,59,0.2);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
    }

    /* Nodes list */
    .nodes-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 24px;
    }
    .node-row {
      background: var(--bg-card);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: var(--transition);
      &:hover { box-shadow: var(--shadow-md); }
      &.node-row--active { border-color: var(--amber); background: rgba(242,169,59,0.025); }
    }

    .status-dot {
      width: 11px; height: 11px;
      border-radius: 50%;
      &.online  { background: var(--teal); animation: pulse-teal 2s ease-in-out infinite; }
      &.offline { background: var(--coral); }
      &.checking{ background: var(--amber); animation: pulse-teal 1s ease-in-out infinite; }
    }

    .nr-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .nr-name {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .active-badge {
      background: rgba(242,169,59,0.15);
      color: var(--amber-dark);
      font-size: 10px;
      font-family: var(--font-mono);
      padding: 2px 8px;
      border-radius: 100px;
      border: 1px solid rgba(242,169,59,0.3);
    }
    .nr-address { font-size: 12.5px; color: var(--text-muted); }
    .nr-badge  { min-width: 110px; }
    .nr-time   { font-size: 11.5px; color: var(--text-muted); min-width: 100px; }
    .nr-actions { display: flex; gap: 8px; }

    .spinner-sm {
      display: inline-block;
      width: 10px; height: 10px;
      border: 1.5px solid rgba(242,169,59,0.3);
      border-top-color: var(--amber);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    /* API reference */
    .api-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .api-route {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
      &:last-child { border-bottom: none; }
    }
    .method-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      min-width: 50px;
      text-align: center;
    }
    .method-get  { background: rgba(92,158,143,0.15); color: var(--teal-dark); }
    .method-post { background: rgba(242,169,59,0.15); color: var(--amber-dark); }

    .route-path { font-size: 12.5px; flex: 1; color: var(--text-primary); }
    .route-desc { font-size: 12.5px; color: var(--text-muted); flex: 2; }

    @media (max-width: 768px) {
      .nodes-page { padding: 20px; }
      .node-row { flex-wrap: wrap; }
      .nr-time, .nr-badge { display: none; }
      .api-route { flex-wrap: wrap; }
    }
  `]
})
export class NodesComponent {
  nodeService = inject(NodeService);
  toast = inject(ToastService);

  newNode = signal({ name: '', host: 'localhost', port: 5003 });

  apiRoutes = [
    { method: 'POST', path: '/{filename}',                   description: 'Upload un fichier sur ce nœud',                   internal: false },
    { method: 'GET',  path: '/{filename}',                   description: 'Télécharger un fichier (avec recherche P2P)',      internal: false },
    { method: 'POST', path: '/internal/replicate/{filename}',description: 'Recevoir un fichier répliqué depuis un autre nœud',internal: true  },
    { method: 'GET',  path: '/internal/local/{filename}',    description: 'Vérifier si un fichier est stocké localement',     internal: true  },
  ];

  isFormValid(): boolean {
    const n = this.newNode();
    return n.name.trim().length > 0 && n.host.trim().length > 0 && n.port > 0;
  }

  addNode(): void {
    const n = this.newNode();
    if (!this.isFormValid()) return;
    this.nodeService.addNode(n.name, n.host, n.port);
    this.toast.success(`Nœud "${n.name}" ajouté sur le port ${n.port}`);
    this.newNode.set({ name: '', host: 'localhost', port: n.port + 1 });
  }

  removeNode(node: P2PNode): void {
    if (node.isActive) {
      this.toast.error('Impossible de supprimer le nœud actif. Activez un autre nœud d\'abord.');
      return;
    }
    this.nodeService.removeNode(node.id);
    this.toast.info(`Nœud "${node.name}" supprimé.`);
  }

  setActive(node: P2PNode): void {
    this.nodeService.setActiveNode(node.id);
    this.toast.success(`Nœud "${node.name}" défini comme nœud actif.`);
  }

  pingNode(node: P2PNode): void {
    this.nodeService.pingNode(node.id);
    this.toast.info(`Ping envoyé à ${node.name}...`);
  }

  pingAll(): void {
    this.nodeService.pingAllNodes();
    this.toast.info('Ping de tous les nœuds en cours...');
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
