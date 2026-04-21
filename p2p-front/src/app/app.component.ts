import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { NodeStateService } from './core/services/node-state.service';
import { ActivityService } from './core/services/activity.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="shell">

      <!-- Sidebar -->
      <aside class="sidebar">

        <!-- Logo 4TECH -->
        <div class="sidebar-logo">
          <img src="assets/logo.jpeg"
               alt="4TECH"
               class="logo-img" />
        </div>

        <!-- Statut des 3 noeuds -->
        <div class="nodes-status">
          @for (node of nodeState.nodes; track node.id) {
            <div class="node-chip" [style.border-color]="node.color + '35'">

              <!-- Point de statut -->
              @if (nodeState.isPending(node.id)) {
                <span class="node-chip-dot pending"></span>
              } @else if (nodeState.isOnline(node.id)) {
                <span class="node-chip-dot online" [style.background]="node.color"
                      [style.box-shadow]="'0 0 0 3px ' + node.color + '25'"></span>
              } @else {
                <span class="node-chip-dot offline"></span>
              }

              <span class="node-chip-label" [style.color]="node.color">{{ node.label }}</span>
              <span class="node-chip-port">:{{ node.port }}</span>

              <!-- Latence ou statut -->
              <span class="node-chip-status">
                @if (nodeState.isPending(node.id)) {
                  <span class="status-pending">vérification…</span>
                } @else if (nodeState.isOnline(node.id)) {
                  <span class="status-online">{{ nodeState.health()[node.id]?.responseTimeMs }}ms</span>
                } @else {
                  <span class="status-offline">hors ligne</span>
                }
              </span>
            </div>
          }
        </div>

        <!-- Navigation -->
        <nav class="nav">
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
            </svg>
            Tableau de bord
          </a>

          <a class="nav-item" routerLink="/upload" routerLinkActive="active">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v9M4 6l4-4 4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 13h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            Upload fichier
          </a>

          <a class="nav-item" routerLink="/download" routerLinkActive="active">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v9M4 8l4 4 4-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 13h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            Download fichier
          </a>

          <a class="nav-item" routerLink="/replication" routerLinkActive="active">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              <path d="M2 8l2-2M2 8l2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/>
            </svg>
            Réplication
          </a>

          <a class="nav-item" routerLink="/nodes" routerLinkActive="active">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="4" r="2.5" stroke="currentColor" stroke-width="1.3"/>
              <circle cx="3" cy="13" r="2.5" stroke="currentColor" stroke-width="1.3"/>
              <circle cx="13" cy="13" r="2.5" stroke="currentColor" stroke-width="1.3"/>
              <path d="M6 5.5L3.5 10.5M10 5.5L12.5 10.5M5.5 13h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            État des nœuds
          </a>
        </nav>

        <!-- Footer -->
        <div class="sidebar-footer">
          <button class="ping-btn" [disabled]="pinging()" (click)="pingAll()">
            <span class="ping-icon" [class.spinning]="pinging()">↺</span>
            {{ pinging() ? 'Vérification…' : 'Vérifier les nœuds' }}
          </button>
          <div class="footer-stats">
            <span class="online-badge"
                  [class.all-online]="nodeState.onlineCount() === 3"
                  [class.partial]="nodeState.onlineCount() > 0 && nodeState.onlineCount() < 3"
                  [class.offline]="nodeState.onlineCount() === 0 && !anyPending()">
              {{ nodeState.onlineCount() }}/3 nœuds en ligne
            </span>
          </div>
        </div>

      </aside>

      <!-- Contenu principal -->
      <main class="main">
        <router-outlet />
      </main>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }

    .shell { display: flex; height: 100vh; background: var(--bg-base); }

    .sidebar {
      width: 240px; flex-shrink: 0;
      background: var(--bg-surface);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
    }

    .sidebar-logo {
      display: flex; align-items: center; justify-content: center;
      padding: 16px 18px 14px;
      border-bottom: 1px solid var(--border);
    }
    .logo-img {
  width: 160px;
  height: auto;
  object-fit: contain;
  mix-blend-mode: screen;   /* supprime le fond blanc sur thème sombre */
}

    /* ── Statut noeuds ── */
    .nodes-status {
      padding: 12px 14px; display: flex; flex-direction: column; gap: 7px;
      border-bottom: 1px solid var(--border);
    }
    .node-chip {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 11px; border-radius: 9px;
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      transition: border-color .3s;
    }

    /* ── Points de statut ── */
    .node-chip-dot {
      width: 8px; height: 8px; border-radius: 50%;
      flex-shrink: 0; transition: all .3s;
    }
    .node-chip-dot.pending {
      background: var(--text-muted);
      animation: blink 1.2s ease-in-out infinite;
    }
    .node-chip-dot.offline  { background: var(--red); }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

    .node-chip-label { font-size: 12px; font-weight: 600; flex: 1; }
    .node-chip-port  { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
    .node-chip-status { margin-left: auto; }

    .status-online  { font-family: var(--font-mono); font-size: 10px; color: var(--green); }
    .status-offline { font-size: 10px; color: var(--red); }
    .status-pending { font-size: 10px; color: var(--text-muted); font-style: italic; }

    /* ── Nav ── */
    .nav { flex: 1; padding: 10px; display: flex; flex-direction: column; gap: 2px; }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 8px;
      font-size: 13px; color: var(--text-secondary);
      text-decoration: none;
      transition: background .15s, color .15s;
    }
    .nav-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
    .nav-item.active { background: rgba(108,143,255,.12); color: var(--accent); font-weight: 500; }

    /* ── Footer ── */
    .sidebar-footer { padding: 14px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }

    .ping-btn {
      width: 100%; padding: 9px 12px; border-radius: 8px;
      border: 1px solid var(--border-bright);
      background: transparent; color: var(--text-secondary);
      font-size: 12px; font-family: var(--font-body);
      cursor: pointer; transition: all .15s;
      display: flex; align-items: center; justify-content: center; gap: 7px;
    }
    .ping-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
    .ping-btn:disabled { opacity: .5; cursor: not-allowed; }

    .ping-icon { font-size: 14px; display: inline-block; transition: transform .3s; }
    .ping-icon.spinning { animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .footer-stats { text-align: center; }
    .online-badge {
      font-size: 11px; font-family: var(--font-mono);
      padding: 3px 10px; border-radius: 20px;
      background: var(--bg-elevated); color: var(--text-muted);
      border: 1px solid var(--border);
    }
    .online-badge.all-online { background: rgba(52,211,153,.1); color: var(--green); border-color: rgba(52,211,153,.2); }
    .online-badge.partial    { background: rgba(251,191,36,.1);  color: var(--amber); border-color: rgba(251,191,36,.2); }
    .online-badge.offline    { background: rgba(248,113,113,.1); color: var(--red);   border-color: rgba(248,113,113,.2); }

    .main { flex: 1; overflow-y: auto; background: var(--bg-base); }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  nodeState = inject(NodeStateService);
  private activity = inject(ActivityService);

  pinging  = signal(false);
  private sub?: Subscription;

  anyPending = () => this.nodeState.nodes.some(n => this.nodeState.isPending(n.id));

  ngOnInit() {
    this.runPing();
    this.sub = interval(15000).subscribe(() => this.runPing());
    this.activity.info('Interface P2P démarrée — vérification des 3 nœuds en cours…');
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  pingAll() {
    if (this.pinging()) return;
    this.runPing();
    this.activity.info('Vérification manuelle des nœuds lancée');
  }

  private runPing() {
    this.pinging.set(true);
    this.nodeState.pingAll();
    setTimeout(() => this.pinging.set(false), 4500);
  }
}