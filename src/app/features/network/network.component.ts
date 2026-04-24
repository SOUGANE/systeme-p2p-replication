import { Component, inject, signal, computed, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NodeService } from '../../core/services/node.service';
import { FileService } from '../../core/services/file.service';
import { ToastService } from '../../core/services/toast.service';
import { P2PNode } from '../../core/models/models';

@Component({
  selector: 'app-network',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="network-page">

      <!-- ── En-tête ───────────────────────────────────────────────────── -->
      <div class="page-header">
        <div>
          <h1>Réseau P2P</h1>
          <p>Visualisation de la topologie du réseau et gestion des communications inter-nœuds.</p>
        </div>
        <button class="btn btn-secondary" (click)="pingAll()">
          <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
          </svg>
          Ping réseau
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════
           LIGNE 1 — 3 colonnes égales
           ⟳ Réplication | 📊 Statistiques | 🛡️ Simulation de pannes
           ══════════════════════════════════════════════════════════════════ -->
      <div class="tools-row animate-fade-in-up">

        <!-- ⟳ Réplication manuelle -->
        <div class="card tools-card">
          <div class="card-header">
            <h3>⟳ Réplication manuelle</h3>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>Fichier à répliquer</label>
              <input [(ngModel)]="replicateFilename"
                     placeholder="ex: rapport.pdf"
                     type="text"
                     (keydown.enter)="doReplicate()"/>
            </div>
            <div class="repl-nodes-row">
              <div class="form-group flex-1">
                <label>Nœud source</label>
                <select [(ngModel)]="replicateSourceId">
                  @for (node of nodeService.nodes(); track node.id) {
                    <option [value]="node.id">
                      {{ node.name }} :{{ node.port }}
                      {{ node.status === 'offline' ? ' ✕' : node.status === 'online' ? ' ✓' : ' …' }}
                    </option>
                  }
                </select>
              </div>
              <div class="repl-arrow">→</div>
              <div class="form-group flex-1">
                <label>Nœud destination</label>
                <select [(ngModel)]="replicateDestId">
                  @for (node of nodeService.nodes(); track node.id) {
                    <option [value]="node.id">
                      {{ node.name }} :{{ node.port }}
                      {{ node.status === 'offline' ? ' ✕' : node.status === 'online' ? ' ✓' : ' …' }}
                    </option>
                  }
                </select>
              </div>
            </div>
            @if (replicateSourceId === replicateDestId && replicateFilename.trim()) {
              <p class="warn-msg">⚠️ Source et destination doivent être différents</p>
            }
            <button
              class="btn btn-teal replicate-btn"
              (click)="doReplicate()"
              [disabled]="!replicateFilename.trim() || replicateSourceId === replicateDestId || replicating()"
            >
              @if (replicating()) {
                <span class="spinner"></span> Réplication…
              } @else {
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"/>
                  <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z"/>
                </svg>
                Lancer la réplication
              }
            </button>
          </div>
        </div>

        <!-- 📊 Statistiques réseau -->
        <div class="card tools-card">
          <div class="card-header">
            <h3>📊 Statistiques réseau</h3>
            <button class="btn btn-sm btn-secondary" (click)="pingAll()" title="Actualiser">↺</button>
          </div>
          <div class="card-body">
            <!-- Barre disponibilité -->
            <div class="avail-block">
              <div class="avail-header">
                <span class="avail-label">Disponibilité</span>
                <span class="avail-pct mono">{{ availabilityPct() }}%</span>
              </div>
              <div class="avail-bar">
                <div class="avail-fill" [style.width.%]="availabilityPct()"></div>
              </div>
            </div>

            <div class="net-stats">
              <div class="ns-item">
                <span class="ns-label">Nœuds total</span>
                <span class="ns-value mono">{{ nodeService.stats().totalNodes }}</span>
              </div>
              <div class="ns-item">
                <span class="ns-label">En ligne</span>
                <span class="ns-value mono" style="color:var(--teal)">{{ nodeService.stats().onlineNodes }}</span>
              </div>
              <div class="ns-item">
                <span class="ns-label">Hors ligne</span>
                <span class="ns-value mono" style="color:var(--coral)">{{ nodeService.stats().offlineNodes }}</span>
              </div>
              <div class="ns-item">
                <span class="ns-label">Connexions P2P</span>
                <span class="ns-value mono" style="color:var(--amber)">{{ connections() }}</span>
              </div>
              <div class="ns-item">
                <span class="ns-label">Fichiers suivis</span>
                <span class="ns-value mono">{{ fileService.getAllFiles().length }}</span>
              </div>
            </div>

            <!-- Mini nœuds -->
            <div class="node-chips">
              @for (node of nodeService.nodes(); track node.id) {
                <div class="node-chip"
                  [class.chip-online]="node.status === 'online'"
                  [class.chip-offline]="node.status === 'offline'"
                  [class.chip-checking]="node.status === 'checking'">
                  <span class="chip-dot"></span>
                  <span class="chip-name">{{ node.name }}</span>
                  <span class="chip-port mono">:{{ node.port }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- 🛡️ Simulation de pannes -->
        <div class="card tools-card">
          <div class="card-header">
            <h3>🛡️ Simulation de pannes</h3>
            <span class="badge badge--warning" style="font-size:10px">Test tolérance</span>
          </div>
          <div class="card-body">
            <p class="hint-sm">
              Mettez un nœud hors ligne pour vérifier que les fichiers répliqués restent accessibles via les autres nœuds.
            </p>
            <div class="fault-nodes">
              @for (node of nodeService.nodes(); track node.id) {
                <div class="fault-row" [class.fault-row--offline]="node.status === 'offline'">
                  <div class="fr-info">
                    <div class="fr-dot"
                      [class.dot-online]="node.status === 'online'"
                      [class.dot-offline]="node.status === 'offline'"
                      [class.dot-checking]="node.status === 'checking'">
                    </div>
                    <span class="fr-name">{{ node.name }}</span>
                    <span class="fr-port mono">:{{ node.port }}</span>
                    @if (node.isActive) {
                      <span class="fr-active-tag">Actif</span>
                    }
                  </div>
                  <div class="fr-actions">
                    @if (node.status !== 'offline') {
                      <button class="btn btn-sm btn-danger" (click)="simulateOffline(node)">
                        ⚡ Hors ligne
                      </button>
                    } @else {
                      <button class="btn btn-sm btn-teal" (click)="simulateOnline(node)">
                        ↺ Remettre
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            @if (nodeService.stats().offlineNodes > 0) {
              <div class="fault-alert">
                ⚠️ {{ nodeService.stats().offlineNodes }} nœud(s) simulé(s) hors ligne.
                Les fichiers répliqués restent accessibles via les nœuds actifs.
              </div>
            } @else {
              <div class="fault-ok">
                ✅ Tous les nœuds sont opérationnels.
              </div>
            }
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════
           LIGNE 2 — Pleine largeur
           🗺️ Topologie du réseau (canvas animé)
           ══════════════════════════════════════════════════════════════════ -->
      <div class="card map-card animate-fade-in-up" style="animation-delay:80ms">
        <div class="card-header">
          <h3>🗺️ Topologie du réseau</h3>
          <div style="display:flex; align-items:center; gap:12px">
            <span class="badge badge--info mono">{{ nodeService.nodes().length }} nœuds</span>
            <div class="canvas-legend">
              <div class="legend-item"><span class="l-dot l-online"></span> En ligne</div>
              <div class="legend-item"><span class="l-dot l-offline"></span> Hors ligne</div>
              <div class="legend-item"><span class="l-dot l-active"></span> Actif</div>
              <div class="legend-item"><span class="l-dash"></span> Connexion P2P</div>
            </div>
          </div>
        </div>
        <div class="map-body">
          <canvas #networkCanvas class="network-canvas"></canvas>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════
           LIGNE 3 — Pleine largeur
           🔗 Connexions inter-nœuds
           ══════════════════════════════════════════════════════════════════ -->
      <div class="card animate-fade-in-up" style="animation-delay:160ms; margin-top:24px">
        <div class="card-header">
          <h3>🔗 Connexions inter-nœuds</h3>
          <span class="badge badge--info">Architecture Peer-to-Peer</span>
        </div>
        <div class="table-wrapper">
          <table class="p2p-table">
            <thead>
              <tr>
                <th>Nœud source</th>
                <th>Nœud destination</th>
                <th>Type</th>
                <th>Endpoint REST</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              @for (conn of peerConnections(); track conn.id) {
                <tr>
                  <td>
                    <div class="conn-cell">
                      <span class="conn-dot"
                        [class.conn-dot--on]="isNodeOnline(conn.sourceId)"
                        [class.conn-dot--off]="!isNodeOnline(conn.sourceId)">
                      </span>
                      <span class="mono-cell">{{ conn.source }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="conn-cell">
                      <span class="conn-dot"
                        [class.conn-dot--on]="isNodeOnline(conn.destId)"
                        [class.conn-dot--off]="!isNodeOnline(conn.destId)">
                      </span>
                      <span class="mono-cell">{{ conn.dest }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [class]="conn.type === 'replicate' ? 'badge--warning' : 'badge--online'">
                      {{ conn.type === 'replicate' ? '⟳ Réplication' : '↓ Lecture' }}
                    </span>
                  </td>
                  <td>
                    <code class="endpoint-code">{{ conn.endpoint }}</code>
                  </td>
                  <td>
                    @if (isNodeOnline(conn.sourceId) && isNodeOnline(conn.destId)) {
                      <span class="badge badge--online">
                        <span class="pulse-dot"></span> Actif
                      </span>
                    } @else {
                      <span class="badge badge--offline">En attente</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">
                    <div class="empty-state">
                      <div class="empty-icon">🔌</div>
                      <h4>Aucune connexion P2P enregistrée</h4>
                      <p>Ajoutez au moins 2 nœuds pour voir les connexions.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .network-page {
      padding: 36px 40px;
      max-width: 1400px;
    }

    /* ── En-tête ──────────────────────────────────────────────────────── */
    .page-header {
      display: flex; align-items: center;
      justify-content: space-between; margin-bottom: 28px; gap: 16px;
      h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
      p  { color: var(--text-muted); font-size: 14px; margin-top: 4px; }
    }

    /* ── LIGNE 1 : 3 colonnes ─────────────────────────────────────────── */
    .tools-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 24px;
      align-items: start;
    }
    .tools-card { height: 100%; }

    /* Réplication */
    .repl-nodes-row {
      display: flex; align-items: flex-end; gap: 10px; margin-bottom: 4px;
    }
    .flex-1 { flex: 1; min-width: 0; }
    .repl-arrow {
      font-size: 18px; color: var(--amber);
      font-weight: 700; padding-bottom: 10px; flex-shrink: 0;
    }
    .replicate-btn { width: 100%; justify-content: center; margin-top: 14px; }
    .warn-msg {
      font-size: 12px; color: var(--amber-dark);
      background: rgba(242,169,59,0.1); border-radius: var(--radius-sm);
      padding: 8px 12px; margin-top: 8px;
    }

    /* Statistiques */
    .avail-block { margin-bottom: 16px; }
    .avail-header {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 6px;
    }
    .avail-label { font-size: 12px; color: var(--text-muted); font-family: var(--font-display); font-weight: 600; }
    .avail-pct   { font-size: 13px; color: var(--teal); }
    .avail-bar {
      height: 6px; background: rgba(92,158,143,0.15);
      border-radius: 3px; overflow: hidden;
    }
    .avail-fill {
      height: 100%; background: var(--teal);
      border-radius: 3px; transition: width 0.6s ease;
    }

    .net-stats { display: flex; flex-direction: column; margin-bottom: 16px; }
    .ns-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 9px 0; border-bottom: 1px solid var(--border);
      &:last-child { border-bottom: none; }
    }
    .ns-label { font-size: 12.5px; color: var(--text-secondary); }
    .ns-value  { font-family: var(--font-mono); font-size: 14px; font-weight: 600; }

    .node-chips {
      display: flex; flex-direction: column; gap: 6px;
      padding-top: 12px; border-top: 1px solid var(--border);
    }
    .node-chip {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px; border-radius: var(--radius-sm);
      border: 1px solid var(--border); background: var(--bg-primary);
      font-size: 12.5px;
    }
    .chip-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    }
    .chip-online  .chip-dot { background: var(--teal); animation: pulse-teal 2s ease-in-out infinite; }
    .chip-offline .chip-dot { background: var(--coral); }
    .chip-checking .chip-dot { background: var(--amber); animation: pulse-teal 1s ease-in-out infinite; }
    .chip-name { font-family: var(--font-display); font-weight: 700; flex: 1; }
    .chip-port { font-size: 11px; color: var(--text-muted); }

    /* Simulation */
    .hint-sm {
      font-size: 12.5px; color: var(--text-muted);
      line-height: 1.6; margin-bottom: 14px;
    }
    .fault-nodes { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
    .fault-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 12px; border-radius: var(--radius-sm);
      border: 1px solid var(--border); background: var(--bg-primary);
      transition: var(--transition);
      &.fault-row--offline {
        background: rgba(224,92,92,0.04);
        border-color: rgba(224,92,92,0.2);
        opacity: 0.75;
      }
    }
    .fr-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .fr-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      &.dot-online   { background: var(--teal); }
      &.dot-offline  { background: var(--coral); }
      &.dot-checking { background: var(--amber); }
    }
    .fr-name { font-family: var(--font-display); font-size: 13px; font-weight: 700; }
    .fr-port { font-size: 11px; color: var(--text-muted); }
    .fr-active-tag {
      background: rgba(242,169,59,0.15); color: var(--amber-dark);
      font-size: 9px; font-family: var(--font-mono);
      padding: 1px 6px; border-radius: 100px;
      border: 1px solid rgba(242,169,59,0.3);
    }
    .fr-actions { flex-shrink: 0; }

    .fault-alert {
      font-size: 12px; line-height: 1.5;
      padding: 10px 12px; border-radius: var(--radius-sm);
      background: rgba(242,169,59,0.08); color: var(--amber-dark);
      border: 1px solid rgba(242,169,59,0.2);
    }
    .fault-ok {
      font-size: 12px; padding: 10px 12px;
      border-radius: var(--radius-sm);
      background: rgba(92,158,143,0.08); color: var(--teal-dark);
      border: 1px solid rgba(92,158,143,0.2);
    }

    /* ── LIGNE 2 : Topologie (pleine largeur) ─────────────────────────── */
    .map-card {
      margin-bottom: 0;
      .card-header { flex-wrap: wrap; gap: 12px; }
    }
    .map-body { padding: 0; }
    .network-canvas {
      width: 100%; height: 400px;
      display: block; border-radius: 0 0 var(--radius-md) var(--radius-md);
      background: var(--bg-primary);
    }

    /* Légende inline dans le header */
    .canvas-legend {
      display: flex; gap: 16px; flex-wrap: wrap;
    }
    .legend-item {
      display: flex; align-items: center; gap: 6px;
      font-size: 11.5px; color: var(--text-muted);
      font-family: var(--font-display); font-weight: 600;
    }
    .l-dot { width: 9px; height: 9px; border-radius: 50%; }
    .l-online   { background: var(--teal); }
    .l-offline  { background: var(--coral); }
    .l-active   { background: var(--amber); box-shadow: 0 0 0 2px rgba(242,169,59,0.25); }
    .l-dash {
      width: 20px; height: 2px;
      background: repeating-linear-gradient(
        90deg, var(--amber) 0, var(--amber) 4px, transparent 4px, transparent 8px
      );
    }

    /* ── LIGNE 3 : Connexions (pleine largeur) ────────────────────────── */
    .conn-cell {
      display: flex; align-items: center; gap: 8px;
    }
    .conn-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
      &.conn-dot--on  { background: var(--teal); animation: pulse-teal 2s ease-in-out infinite; }
      &.conn-dot--off { background: var(--coral); }
    }
    .endpoint-code {
      font-family: var(--font-mono); font-size: 11.5px;
      background: rgba(242,169,59,0.08); color: var(--amber-dark);
      padding: 2px 7px; border-radius: 4px;
      border: 1px solid rgba(242,169,59,0.15);
    }
    .pulse-dot {
      display: inline-block; width: 6px; height: 6px;
      border-radius: 50%; background: var(--teal);
      animation: pulse-teal 2s ease-in-out infinite;
      margin-right: 5px; vertical-align: middle;
    }

    @media (max-width: 1100px) {
      .tools-row { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .network-page { padding: 20px; }
      .tools-row { grid-template-columns: 1fr; }
      .network-canvas { height: 300px; }
      .canvas-legend { display: none; }
    }
  `]
})
export class NetworkComponent implements AfterViewInit, OnDestroy {
  @ViewChild('networkCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  nodeService = inject(NodeService);
  fileService = inject(FileService);
  toast       = inject(ToastService);

  replicateFilename = '';
  replicateSourceId = this.nodeService.activeNode().id;
  replicateDestId   = this.nodeService.nodes()[1]?.id ?? '';
  replicating       = signal(false);

  private animFrame?: number;
  private particles: Array<{
    x: number; y: number; vx: number; vy: number;
    alpha: number; fromIdx: number; toIdx: number; progress: number;
  }> = [];

  connections = computed(() => {
    const n = this.nodeService.stats().totalNodes;
    return n * (n - 1);
  });

  availabilityPct = computed(() => {
    const s = this.nodeService.stats();
    return s.totalNodes === 0 ? 0 : Math.round((s.onlineNodes / s.totalNodes) * 100);
  });

  peerConnections = computed(() => {
    const nodes = this.nodeService.nodes();
    const conns: Array<{
      id: string; source: string; dest: string;
      sourceId: string; destId: string;
      type: string; endpoint: string;
    }> = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const src = nodes[i], dst = nodes[j];
        conns.push({
          id: `${src.id}-${dst.id}-r`,
          source: `${src.name}:${src.port}`, sourceId: src.id,
          dest:   `${dst.name}:${dst.port}`, destId:   dst.id,
          type: 'replicate',
          endpoint: 'POST /files/internal/replicate/{f}'
        });
        conns.push({
          id: `${src.id}-${dst.id}-l`,
          source: `${dst.name}:${dst.port}`, sourceId: dst.id,
          dest:   `${src.name}:${src.port}`, destId:   src.id,
          type: 'read',
          endpoint: 'GET /files/internal/local/{f}'
        });
      }
    }
    return conns;
  });

  isNodeOnline(nodeId: string): boolean {
    return this.nodeService.nodes().find(n => n.id === nodeId)?.status === 'online';
  }

  ngAfterViewInit(): void { this.drawNetwork(); }
  ngOnDestroy(): void     { if (this.animFrame) cancelAnimationFrame(this.animFrame); }

  private drawNetwork(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width, H = rect.height;
    const nodes = this.nodeService.nodes();
    const n     = nodes.length;
    const cx = W / 2, cy = H / 2;
    const r  = Math.min(W, H) * 0.32;

    const positions = nodes.map((_, i) => ({
      x: cx + r * Math.cos((2 * Math.PI * i / n) - Math.PI / 2),
      y: cy + r * Math.sin((2 * Math.PI * i / n) - Math.PI / 2),
    }));

    const spawnParticle = () => {
      if (n < 2) return;
      const fromIdx = Math.floor(Math.random() * n);
      let toIdx = Math.floor(Math.random() * n);
      if (toIdx === fromIdx) toIdx = (fromIdx + 1) % n;
      this.particles.push({
        x: positions[fromIdx].x, y: positions[fromIdx].y,
        vx: 0, vy: 0, alpha: 1, fromIdx, toIdx, progress: 0
      });
    };

    let tick = 0;
    const animate = () => {
      ctx.clearRect(0, 0, W, H);

      // Grille de fond
      ctx.fillStyle = 'rgba(93,72,50,0.05)';
      for (let gx = 20; gx < W; gx += 30)
        for (let gy = 20; gy < H; gy += 30) {
          ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill();
        }

      // Arêtes
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const bothOn = nodes[i].status === 'online' && nodes[j].status === 'online';
          ctx.setLineDash([4, 5]);
          ctx.lineWidth   = 1.5;
          ctx.strokeStyle = bothOn ? 'rgba(92,158,143,0.35)' : 'rgba(224,92,92,0.2)';
          ctx.beginPath();
          ctx.moveTo(positions[i].x, positions[i].y);
          ctx.lineTo(positions[j].x, positions[j].y);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);

      // Particules
      tick++;
      if (tick % 80 === 0) spawnParticle();
      this.particles = this.particles.filter(p => p.progress < 1);
      for (const p of this.particles) {
        p.progress += 0.012;
        const from = positions[p.fromIdx], to = positions[p.toIdx];
        p.x     = from.x + (to.x - from.x) * p.progress;
        p.y     = from.y + (to.y - from.y) * p.progress;
        p.alpha = p.progress < 0.5 ? p.progress * 2 : (1 - p.progress) * 2;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
        g.addColorStop(0, `rgba(242,169,59,${p.alpha})`);
        g.addColorStop(1, 'rgba(242,169,59,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
      }

      // Nœuds
      nodes.forEach((node, i) => {
        const { x, y }   = positions[i];
        const isActive   = node.isActive;
        const isOnline   = node.status === 'online';
        const isChecking = node.status === 'checking';

        if (isOnline || isActive) {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, isActive ? 36 : 28);
          glow.addColorStop(0, isActive ? 'rgba(242,169,59,0.18)' : 'rgba(92,158,143,0.14)');
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(x, y, isActive ? 36 : 28, 0, Math.PI * 2); ctx.fill();
        }

        const col   = isOnline ? '#5C9E8F' : isChecking ? '#F2A93B' : '#E05C5C';
        ctx.fillStyle   = isActive ? '#F2A93B' : col;
        ctx.beginPath(); ctx.arc(x, y, isActive ? 22 : 18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = isActive ? '#FAF0E6' : 'rgba(255,255,255,0.8)';
        ctx.lineWidth   = isActive ? 2.5 : 1.5;
        ctx.stroke();

        if (isOnline) {
          const pct  = ((tick * 1.5) % 100) / 100;
          ctx.strokeStyle = `rgba(92,158,143,${0.35 * (1 - pct)})`;
          ctx.lineWidth   = 1.5;
          ctx.beginPath(); ctx.arc(x, y, 18 + pct * 16, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.fillStyle = '#1C1A17';
        ctx.font      = `700 12px 'Syne', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(node.name, x, y + 34 + (isActive ? 4 : 0));
        ctx.fillStyle = 'rgba(28,26,23,0.45)';
        ctx.font      = `400 10px 'IBM Plex Mono', monospace`;
        ctx.fillText(`:${node.port}`, x, y + 46 + (isActive ? 4 : 0));
      });

      ctx.fillStyle = 'rgba(28,26,23,0.18)';
      ctx.font      = `600 11px 'Syne', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('P2P NETWORK', cx, cy);

      this.animFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  pingAll(): void {
    this.nodeService.pingAllNodes();
    this.toast.info('Ping de tous les nœuds lancé…');
  }

  doReplicate(): void {
    if (!this.replicateFilename.trim() || this.replicateSourceId === this.replicateDestId) return;
    const src  = this.nodeService.nodes().find(n => n.id === this.replicateSourceId);
    const dest = this.nodeService.nodes().find(n => n.id === this.replicateDestId);
    if (!src || !dest) return;

    if (src.status  === 'offline') { this.toast.error(`${src.name} est hors ligne`);  return; }
    if (dest.status === 'offline') { this.toast.error(`${dest.name} est hors ligne`); return; }

    this.replicating.set(true);
    this.fileService.replicateFile(src, dest, this.replicateFilename).subscribe({
      next: () => {
        this.toast.success(
          `Réplication réussie "${this.replicateFilename}" : ${src.name} → ${dest.name}`
        );
        this.replicating.set(false);
      },
      error: (err: Error) => {
        this.toast.error('Échec de la réplication. Vérifiez que les nœuds sont en ligne.');
        this.replicating.set(false);
      }
    });
  }

  simulateOffline(node: P2PNode): void {
    this.nodeService['_nodes'].update((nodes: P2PNode[]) =>
      nodes.map(n => n.id === node.id ? { ...n, status: 'offline' as const } : n)
    );
    this.toast.info( `Simulation :${node.name} (port ${node.port}) mis hors ligne`);
  }

  simulateOnline(node: P2PNode): void {
    this.nodeService.pingNode(node.id);
    this.toast.info(`Tentative de reconnexion de ${node.name}…`);
  }
}
