import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NodeService } from '../../core/services/node.service';
import { FileService } from '../../core/services/file.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="dashboard-page">
      <!-- Page Header -->
      <header class="dash-header">
        <div class="dash-header-text">
          <h1>Tableau de bord</h1>
          <p>Vue d'ensemble du réseau P2P distribué</p>
        </div>
        <button class="btn btn-primary" (click)="refreshAll()">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" [class.spin]="refreshing()">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
          </svg>
          Actualiser
        </button>
      </header>

      <!-- Stat Cards -->
      <div class="stat-grid">
        <div class="stat-card stat-nodes animate-fade-in-up" style="animation-delay:0ms">
          <div class="sc-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/>
              <rect x="9" y="15" width="6" height="6" rx="1"/>
              <path d="M5 9v3h14V9"/><path d="M12 12v3"/>
            </svg>
          </div>
          <div class="sc-info">
            <div class="sc-value">{{ nodeService.stats().totalNodes }}</div>
            <div class="sc-label">Nœuds total</div>
          </div>
          <div class="sc-sub">
            <span class="badge badge--online">{{ nodeService.stats().onlineNodes }} en ligne</span>
          </div>
        </div>

        <div class="stat-card stat-online animate-fade-in-up" style="animation-delay:60ms">
          <div class="sc-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div class="sc-info">
            <div class="sc-value">{{ nodeService.stats().onlineNodes }}</div>
            <div class="sc-label">Nœuds actifs</div>
          </div>
          <div class="sc-sub">
            <div class="availability-bar">
              <div class="ab-fill" [style.width.%]="availabilityPct()"></div>
            </div>
            <span class="sc-pct">{{ availabilityPct() }}%</span>
          </div>
        </div>

        <div class="stat-card stat-offline animate-fade-in-up" style="animation-delay:120ms">
          <div class="sc-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
            </svg>
          </div>
          <div class="sc-info">
            <div class="sc-value">{{ nodeService.stats().offlineNodes }}</div>
            <div class="sc-label">Nœuds hors ligne</div>
          </div>
          <div class="sc-sub">
            @if (nodeService.stats().offlineNodes > 0) {
              <span class="badge badge--offline">Attention</span>
            } @else {
              <span class="badge badge--online">Aucune panne</span>
            }
          </div>
        </div>

        <div class="stat-card stat-files animate-fade-in-up" style="animation-delay:180ms">
          <div class="sc-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div class="sc-info">
            <div class="sc-value">{{ totalFilesTracked() }}</div>
            <div class="sc-label">Fichiers suivis</div>
          </div>
          <div class="sc-sub">
            <a routerLink="/files" class="sc-link">Gérer les fichiers →</a>
          </div>
        </div>
      </div>

      <!-- Node Status Grid -->
      <div class="section animate-fade-in-up" style="animation-delay:240ms">
        <div class="section-header">
          <h2>État des nœuds</h2>
          <a routerLink="/nodes" class="see-all">Gérer les nœuds →</a>
        </div>
        <div class="nodes-grid">
          @for (node of nodeService.nodes(); track node.id) {
            <div class="node-card" [class.node-active]="node.isActive">
              <div class="nc-header">
                <div class="nc-dot-wrap">
                  <div class="nc-dot"
                    [class.dot-online]="node.status === 'online'"
                    [class.dot-offline]="node.status === 'offline'"
                    [class.dot-checking]="node.status === 'checking'">
                  </div>
                </div>
                <div class="nc-title">{{ node.name }}</div>
                @if (node.isActive) {
                  <span class="active-tag">Actif</span>
                }
              </div>
              <div class="nc-address mono">{{ node.host }}:{{ node.port }}</div>
              <div class="nc-status">
                @switch (node.status) {
                  @case ('online')   { <span class="badge badge--online">En ligne</span> }
                  @case ('offline')  { <span class="badge badge--offline">Hors ligne</span> }
                  @case ('checking') { <span class="badge badge--warning">Vérification…</span> }
                }
              </div>
              <div class="nc-files">
                <span class="mono">{{ fileService.getFilesForNode(node.id).length }}</span>
                <span class="nc-files-label">fichiers locaux</span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Recent Activity -->
      <!-- <div class="section animate-fade-in-up" style="animation-delay:300ms">
        <div class="section-header">
          <h2>Activité récente</h2>
        </div>
        <div class="activity-list card">
          @if (activity().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <h4>Aucune activité</h4>
              <p>Les événements du réseau s'afficheront ici.</p>
            </div>
          } @else {
            @for (item of activity(); track item.id) {
              <div class="activity-item">
                <div class="ai-icon" [class]="'ai-icon--' + item.type">
                  {{ item.type === 'upload' ? '↑' : item.type === 'download' ? '↓' : item.type === 'replicate' ? '⟳' : '●' }}
                </div>
                <div class="ai-content">
                  <span class="ai-msg">{{ item.message }}</span>
                  <span class="ai-time mono">{{ item.time }}</span>
                </div>
                <span class="badge" [class]="'badge--' + item.badge">{{ item.badgeLabel }}</span>
              </div>
            }
          }
        </div>
      </div> --> 

      <!-- Architecture Info -->
      <div class="section animate-fade-in-up" style="animation-delay:360ms">
        <div class="section-header">
          <h2>Principes Architecturaux</h2>
        </div>
        <div class="arch-info-grid">
          <div class="arch-card">
            <div class="arch-icon">🔗</div>
            <h3>Architecture P2P</h3>
            <p>Aucun serveur central. Tous les nœuds sont égaux et communiquent directement entre eux.</p>
          </div>
          <div class="arch-card">
            <div class="arch-icon">📦</div>
            <h3>Réplication</h3>
            <p>Chaque fichier est copié sur au moins un autre nœud pour garantir la disponibilité.</p>
          </div>
          <div class="arch-card">
            <div class="arch-icon">🛡️</div>
            <h3>Tolérance aux pannes</h3>
            <p>Le système continue de fonctionner même si un nœud tombe en panne.</p>
          </div>
          <div class="arch-card">
            <div class="arch-icon">⚡</div>
            <h3>Distribution</h3>
            <p>Les fichiers sont répartis entre plusieurs nœuds simulés sur la même machine.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding: 36px 40px;
      max-width: 1300px;
    }

    .dash-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
    }
    .dash-header-text h1 {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .dash-header-text p {
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 4px;
    }

    /* Stat Grid */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: var(--bg-card);
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      padding: 20px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
      overflow: hidden;
      transition: box-shadow var(--transition), transform var(--transition);

      &:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
    }
    .stat-nodes::before { background: var(--amber); }
    .stat-online::before { background: var(--teal); }
    .stat-offline::before { background: var(--coral); }
    .stat-files::before { background: var(--blush-dark); }

    .sc-icon {
      width: 40px; height: 40px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
    }
    .sc-icon svg { width: 22px; height: 22px; }
    .stat-nodes .sc-icon  { background: rgba(242,169,59,0.12); color: var(--amber-dark); }
    .stat-online .sc-icon { background: rgba(92,158,143,0.12); color: var(--teal-dark); }
    .stat-offline .sc-icon{ background: rgba(224,92,92,0.1);   color: var(--coral-dark); }
    .stat-files .sc-icon  { background: rgba(242,196,184,0.2); color: #A05040; }

    .sc-info { display: flex; flex-direction: column; gap: 2px; }
    .sc-value {
      font-family: var(--font-display);
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1;
    }
    .sc-label {
      font-size: 12px;
      color: var(--text-muted);
      font-family: var(--font-display);
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .sc-sub { display: flex; align-items: center; gap: 10px; }
    .sc-link {
      font-size: 12px;
      color: var(--amber-dark);
      text-decoration: none;
      font-family: var(--font-display);
      font-weight: 600;
      &:hover { text-decoration: underline; }
    }
    .sc-pct {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--teal);
    }

    .availability-bar {
      flex: 1;
      height: 4px;
      background: rgba(92,158,143,0.15);
      border-radius: 2px;
      overflow: hidden;
    }
    .ab-fill {
      height: 100%;
      background: var(--teal);
      border-radius: 2px;
      transition: width 0.6s ease;
    }

    /* Sections */
    .section { margin-bottom: 32px; }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      h2 {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
    }
    .see-all {
      font-size: 13px;
      color: var(--amber-dark);
      text-decoration: none;
      font-family: var(--font-display);
      font-weight: 600;
      &:hover { text-decoration: underline; }
    }

    /* Nodes grid */
    .nodes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .node-card {
      background: var(--bg-card);
      border-radius: var(--radius-md);
      border: 1.5px solid var(--border);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: var(--transition);
      &:hover { box-shadow: var(--shadow-md); }
      &.node-active { border-color: var(--amber); background: rgba(242,169,59,0.03); }
    }
    .nc-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nc-dot-wrap { flex-shrink: 0; }
    .nc-dot {
      width: 9px; height: 9px;
      border-radius: 50%;
      &.dot-online  { background: var(--teal); animation: pulse-teal 2s ease-in-out infinite; }
      &.dot-offline { background: var(--coral); }
      &.dot-checking { background: var(--amber); animation: pulse-teal 1s ease-in-out infinite; }
    }
    .nc-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 14px;
      flex: 1;
    }
    .active-tag {
      background: rgba(242,169,59,0.15);
      color: var(--amber-dark);
      font-size: 10px;
      font-family: var(--font-mono);
      padding: 2px 7px;
      border-radius: 100px;
      border: 1px solid rgba(242,169,59,0.3);
    }
    .nc-address {
      font-size: 12px;
      color: var(--text-muted);
    }
    .nc-files {
      display: flex;
      align-items: baseline;
      gap: 6px;
      span { font-size: 20px; font-weight: 700; font-family: var(--font-display); }
    }
    .nc-files-label {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Activity */
    .activity-list {
      .activity-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 20px;
        border-bottom: 1px solid var(--border);
        &:last-child { border-bottom: none; }
      }
    }
    .ai-icon {
      width: 32px; height: 32px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700;
      flex-shrink: 0;
      &.ai-icon--upload   { background: rgba(242,169,59,0.12); color: var(--amber-dark); }
      &.ai-icon--download { background: rgba(92,158,143,0.12); color: var(--teal-dark); }
      &.ai-icon--replicate{ background: rgba(242,196,184,0.2); color: #A05040; }
      &.ai-icon--node     { background: rgba(224,92,92,0.1);   color: var(--coral-dark); }
    }
    .ai-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ai-msg { font-size: 13.5px; }
    .ai-time { font-size: 11px; color: var(--text-muted); }

    /* Architecture cards */
    .arch-info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .arch-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .arch-icon { font-size: 28px; }
    .arch-card h3 { font-size: 14px; font-weight: 700; }
    .arch-card p  { font-size: 12.5px; color: var(--text-muted); line-height: 1.6; }

    .spin { animation: spin 1s linear infinite; }

    @media (max-width: 1200px) {
      .stat-grid      { grid-template-columns: repeat(2, 1fr); }
      .arch-info-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .dashboard-page { padding: 20px; }
      .stat-grid { grid-template-columns: 1fr 1fr; }
      .arch-info-grid { grid-template-columns: 1fr 1fr; }
      .dash-header { flex-direction: column; align-items: flex-start; gap: 16px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  nodeService = inject(NodeService);
  fileService = inject(FileService);

  refreshing = signal(false);

  totalFilesTracked = computed(() => this.fileService.getAllFiles().length);

  availabilityPct = computed(() => {
    const s = this.nodeService.stats();
    return s.totalNodes === 0 ? 0 : Math.round((s.onlineNodes / s.totalNodes) * 100);
  });

  activity = signal<Array<{
    id: string; type: string; message: string; time: string;
    badge: string; badgeLabel: string;
  }>>([]);

  ngOnInit(): void {
    this.nodeService.pingAllNodes();
    // Seed some sample activity
    this.activity.set([
      { id: '1', type: 'upload', message: 'Fichier rapport.pdf uploadé sur Node A', time: 'Il y a 2 min', badge: 'online', badgeLabel: 'Succès' },
      { id: '2', type: 'replicate', message: 'rapport.pdf répliqué vers Node B', time: 'Il y a 2 min', badge: 'info', badgeLabel: 'Réplication' },
      { id: '3', type: 'node', message: 'Node C a rejoint le réseau (port 5002)', time: 'Il y a 5 min', badge: 'online', badgeLabel: 'Connexion' },
      { id: '4', type: 'download', message: 'Téléchargement de data.csv depuis Node B', time: 'Il y a 12 min', badge: 'online', badgeLabel: 'Succès' },
    ]);
  }

  refreshAll(): void {
    this.refreshing.set(true);
    this.nodeService.pingAllNodes();
    setTimeout(() => this.refreshing.set(false), 1500);
  }
}
