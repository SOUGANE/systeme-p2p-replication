import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodeStateService } from '../../core/services/node-state.service';
import { ActivityService } from '../../core/services/activity.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-nodes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">État des nœuds</h1>
          <p class="page-sub">Surveillance en temps réel des 3 instances Spring Boot</p>
        </div>
        <button class="btn-accent" (click)="pingAll()">↺ Vérifier tous</button>
      </header>

      <!-- Grille des 3 noeuds -->
      <div class="nodes-grid">
        @for (node of nodeState.nodes; track node.id) {
          <div class="node-card" [class.online]="nodeState.isOnline(node.id)">

            <!-- En-tête -->
            <div class="nc-header">
              <div class="nc-icon" [style.border-color]="node.color" [style.color]="node.color">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M8 4h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <circle cx="12" cy="14" r="3" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </div>
              <div class="nc-info">
                <div class="nc-label" [style.color]="node.color">{{ node.label }}</div>
                <div class="nc-port">Port {{ node.port }}</div>
              </div>
              <div class="nc-badge"
                   [class.online]="nodeState.isOnline(node.id)"
                   [class.pending]="nodeState.isPending(node.id)">
                @if (nodeState.isPending(node.id)) { Vérification… }
                @else if (nodeState.isOnline(node.id)) { En ligne }
                @else { Hors ligne }
              </div>
            </div>

            <!-- Infos -->
            <div class="nc-rows">
              <div class="nc-row">
                <span class="nc-key">Latence</span>
                <span class="nc-val mono">
                  @if (nodeState.health()[node.id]?.responseTimeMs && nodeState.isOnline(node.id)) {
                    {{ nodeState.health()[node.id]?.responseTimeMs }} ms
                  } @else { — }
                </span>
              </div>
              <div class="nc-row">
                <span class="nc-key">Stockage</span>
                <span class="nc-val mono">{{ node.storage }}</span>
              </div>
              <div class="nc-row">
                <span class="nc-key">Pairs connectés</span>
                <div class="peers-list">
                  @for (peer of nodeState.getPeerNodes(node.id); track peer.id) {
                    <span class="peer-tag" [style.color]="peer.color" [style.border-color]="peer.color + '40'">
                      {{ peer.label }}
                    </span>
                  }
                </div>
              </div>
              <div class="nc-row">
                <span class="nc-key">Dernière vérification</span>
                <span class="nc-val">
                  @if (nodeState.health()[node.id]?.lastChecked) {
                    {{ nodeState.health()[node.id]?.lastChecked | date:'HH:mm:ss' }}
                  } @else { Jamais }
                </span>
              </div>
            </div>

            <!-- Indicateur de santé visuel -->
            <div class="nc-health-bar">
              <div class="health-track">
                <div class="health-fill"
                     [style.width]="nodeState.isOnline(node.id) ? '100%' : '0%'"
                     [style.background]="node.color">
                </div>
              </div>
              <span class="health-label">
                {{ nodeState.isOnline(node.id) ? 'Opérationnel' : 'Injoignable' }}
              </span>
            </div>

            <button class="ping-btn"
                    [style.border-color]="node.color"
                    [style.color]="node.color"
                    (click)="pingNode(node.id)">
              Ping {{ node.label }}
            </button>
          </div>
        }
      </div>

      <!-- Résumé global -->
      <div class="summary-card" [class.full]="nodeState.onlineCount() === 3"
           [class.partial]="nodeState.onlineCount() > 0 && nodeState.onlineCount() < 3"
           [class.down]="nodeState.onlineCount() === 0 && !allPending()">
        <div class="summary-icon">
          @if (nodeState.onlineCount() === 3) { ✓ }
          @else if (nodeState.onlineCount() > 0) { ⚠ }
          @else { ✕ }
        </div>
        <div>
          <div class="summary-title">
            @if (nodeState.onlineCount() === 3) { Système entièrement opérationnel }
            @else if (nodeState.onlineCount() > 0) { Système partiellement disponible }
            @else if (allPending()) { Vérification en cours… }
            @else { Système hors ligne }
          </div>
          <div class="summary-sub">
            {{ nodeState.onlineCount() }} nœud(s) sur 3 en ligne
            · Vérification automatique toutes les 15 secondes
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1100px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: -.02em; }
    .page-sub   { font-size: 13px; color: var(--text-muted); margin-top: 3px; }
    .btn-accent { padding: 9px 18px; border-radius: 8px; border: none; background: var(--accent); color: #fff; font-size: 13px; font-family: var(--font-body); cursor: pointer; transition: opacity .15s; }
    .btn-accent:hover { opacity: .85; }

    .nodes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 16px; }

    .node-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 16px; transition: border-color .3s, box-shadow .3s; }
    .node-card.online { box-shadow: 0 0 0 1px rgba(52,211,153,.1); }

    .nc-header { display: flex; align-items: center; gap: 12px; }
    .nc-icon { width: 46px; height: 46px; border-radius: 12px; border: 1.5px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .nc-label { font-family: var(--font-display); font-size: 16px; font-weight: 700; }
    .nc-port  { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .nc-badge { margin-left: auto; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; background: rgba(248,113,113,.1); color: var(--red); }
    .nc-badge.online  { background: rgba(52,211,153,.1); color: var(--green); }
    .nc-badge.pending { background: var(--bg-elevated); color: var(--text-muted); font-style: italic; font-weight: 400; }

    .nc-rows { display: flex; flex-direction: column; gap: 10px; padding: 14px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .nc-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; }
    .nc-key { color: var(--text-muted); flex-shrink: 0; }
    .nc-val { color: var(--text-secondary); text-align: right; }
    .nc-val.mono { font-family: var(--font-mono); }
    .peers-list { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }
    .peer-tag { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; border: 1px solid; }

    .nc-health-bar { }
    .health-track { height: 4px; background: var(--bg-elevated); border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
    .health-fill { height: 100%; border-radius: 2px; transition: width .6s ease; }
    .health-label { font-size: 11px; color: var(--text-muted); }

    .ping-btn { width: 100%; padding: 9px; border-radius: 8px; border: 1px solid; background: transparent; font-size: 12px; font-weight: 600; font-family: var(--font-body); cursor: pointer; transition: background .15s; }
    .ping-btn:hover { background: rgba(108,143,255,.07); }

    /* Résumé global */
    .summary-card { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-surface); }
    .summary-card.full    { border-color: rgba(52,211,153,.25); background: rgba(52,211,153,.05); }
    .summary-card.partial { border-color: rgba(251,191,36,.25); background: rgba(251,191,36,.05); }
    .summary-card.down    { border-color: rgba(248,113,113,.25); background: rgba(248,113,113,.05); }
    .summary-icon { font-size: 22px; font-weight: 700; flex-shrink: 0; }
    .full .summary-icon    { color: var(--green); }
    .partial .summary-icon { color: var(--amber); }
    .down .summary-icon    { color: var(--red); }
    .summary-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .summary-sub   { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
  `]
})
export class NodesComponent implements OnInit, OnDestroy {
  nodeState = inject(NodeStateService);
  private activity = inject(ActivityService);
  private sub?: Subscription;

  ngOnInit() {
    this.nodeState.pingAll();
    this.sub = interval(10000).subscribe(() => this.nodeState.pingAll());
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  pingAll() { this.nodeState.pingAll(); this.activity.info('Ping broadcast lancé'); }
  pingNode(id: string) { this.nodeState.pingAll(); }
  allPending = () => this.nodeState.nodes.every(n => this.nodeState.isPending(n.id));
}
