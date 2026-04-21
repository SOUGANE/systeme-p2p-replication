import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { NodeStateService } from '../../core/services/node-state.service';
import { ActivityService } from '../../core/services/activity.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">Tableau de bord</h1>
          <p class="page-sub">Vue d'ensemble du système de réplication</p>
        </div>
        <button class="btn-accent" (click)="nodeState.pingAll()">↺ Actualiser</button>
      </header>

      <!-- Schéma des 3 noeuds -->
      <div class="arch-card">
        <div class="arch-label">Réseau P2P — 3 nœuds actifs</div>
        <div class="arch-diagram">
          @for (node of nodeState.nodes; track node.id) {
            <div class="arch-node" [class.online]="nodeState.isOnline(node.id)">
              <div class="arch-icon" [style.border-color]="node.color" [style.color]="node.color">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="2" y="6" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M7 3h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <circle cx="11" cy="12.5" r="2.5" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </div>
              <div class="arch-name" [style.color]="node.color">{{ node.label }}</div>
              <div class="arch-port">Port {{ node.port }}</div>
              <div class="arch-status"
                   [class.online]="nodeState.isOnline(node.id)"
                   [class.pending]="nodeState.isPending(node.id)">
                @if (nodeState.isPending(node.id)) { ◌ Vérification… }
                @else if (nodeState.isOnline(node.id)) { ● En ligne }
                @else { ○ Hors ligne }
              </div>
            </div>
            @if (!$last) {
              <div class="arch-arrow">
                <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
                  <path d="M2 10h36" stroke="var(--border-bright)" stroke-width="1" stroke-dasharray="3 3"/>
                  <path d="M32 5l6 5-6 5" stroke="var(--border-bright)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M8 5L2 10l6 5" stroke="var(--border-bright)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="arch-arrow-label">réplication</span>
              </div>
            }
          }
        </div>
      </div>

      <!-- Métriques -->
      <div class="metrics-row">
        <div class="metric">
          <div class="metric-val" [class.green]="nodeState.onlineCount() === 3">{{ nodeState.onlineCount() }}</div>
          <div class="metric-label">Nœuds actifs</div>
          <div class="metric-sub">sur 3 configurés</div>
        </div>
        <div class="metric">
          <div class="metric-val accent">{{ totalOps() }}</div>
          <div class="metric-label">Opérations</div>
          <div class="metric-sub">dans la session</div>
        </div>
        <div class="metric">
          <div class="metric-val amber">{{ uploadCount() }}</div>
          <div class="metric-label">Fichiers envoyés</div>
          <div class="metric-sub">avec réplication</div>
        </div>
        <div class="metric">
          <div class="metric-val">{{ downloadCount() }}</div>
          <div class="metric-label">Fichiers reçus</div>
          <div class="metric-sub">session en cours</div>
        </div>
      </div>

      <!-- Actions + Journal -->
      <div class="bottom-row">
        <div class="card">
          <div class="card-title">Actions rapides</div>
          <div class="quick-actions">
            <a routerLink="/upload" class="quick-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3v11M6 7l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 17h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>Envoyer un fichier</span>
            </a>
            <a routerLink="/download" class="quick-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3v11M6 11l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 17h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>Récupérer un fichier</span>
            </a>
            <a routerLink="/replication" class="quick-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>Vérifier la réplication</span>
            </a>
            <a routerLink="/nodes" class="quick-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="4" cy="16" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="16" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M7 6.5L4.5 13M13 6.5L15.5 13M7 16h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>État des nœuds</span>
            </a>
          </div>
        </div>

        <div class="card">
          <div class="card-title-row">
            <span class="card-title">Activité récente</span>
            <button class="clear-btn" (click)="activity.clear()">Effacer</button>
          </div>
          <div class="log-feed">
            @if (activity.logs().length === 0) {
              <div class="log-empty">Aucune activité pour le moment</div>
            }
            @for (log of activity.logs().slice(0, 10); track log.id) {
              <div class="log-entry" [class.error]="!log.success">
                <span class="log-dot" [class]="'dot-' + log.type.toLowerCase()"></span>
                <span class="log-msg">{{ log.message }}</span>
                <span class="log-time">{{ log.timestamp | date:'HH:mm:ss' }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1300px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: -.02em; }
    .page-sub   { font-size: 13px; color: var(--text-muted); margin-top: 3px; }
    .btn-accent { padding: 9px 18px; border-radius: 8px; border: none; background: var(--accent); color: #fff; font-size: 13px; font-family: var(--font-body); cursor: pointer; transition: opacity .15s; }
    .btn-accent:hover { opacity: .85; }

    /* ── Architecture ── */
    .arch-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 16px; }
    .arch-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 20px; }
    .arch-diagram { display: flex; align-items: center; justify-content: center; gap: 0; }
    .arch-node { text-align: center; padding: 18px 20px; background: var(--bg-elevated); border-radius: 12px; border: 1px solid var(--border); min-width: 140px; opacity: .45; transition: opacity .3s; }
    .arch-node.online { opacity: 1; }
    .arch-icon { width: 48px; height: 48px; border-radius: 12px; border: 1.5px solid; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
    .arch-name { font-family: var(--font-display); font-size: 15px; font-weight: 700; margin-bottom: 3px; }
    .arch-port { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-bottom: 8px; }
    .arch-status { font-size: 11px; color: var(--red); }
    .arch-status.online  { color: var(--green); }
    .arch-status.pending { color: var(--text-muted); font-style: italic; }
    .arch-arrow { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 12px; }
    .arch-arrow-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; }

    /* ── Métriques ── */
    .metrics-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .metric { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .metric-val  { font-family: var(--font-display); font-size: 34px; font-weight: 700; color: var(--text-primary); }
    .metric-val.green  { color: var(--green); }
    .metric-val.accent { color: var(--accent); }
    .metric-val.amber  { color: var(--amber); }
    .metric-label { font-size: 13px; color: var(--text-secondary); margin-top: 3px; }
    .metric-sub   { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

    /* ── Bottom ── */
    .bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .card-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 14px; }
    .card-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .clear-btn { font-size: 11px; color: var(--text-muted); background: none; border: none; cursor: pointer; }
    .clear-btn:hover { color: var(--text-primary); }

    .quick-actions { display: flex; flex-direction: column; gap: 8px; }
    .quick-btn { display: flex; align-items: center; gap: 12px; padding: 13px 14px; background: var(--bg-elevated); border-radius: 10px; text-decoration: none; color: var(--text-secondary); font-size: 13px; font-weight: 500; transition: all .15s; }
    .quick-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

    .log-feed { display: flex; flex-direction: column; gap: 5px; max-height: 260px; overflow-y: auto; }
    .log-entry { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 7px; font-size: 11px; background: var(--bg-elevated); }
    .log-entry.error { background: rgba(248,113,113,.07); }
    .log-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .dot-upload   { background: var(--accent); }
    .dot-download { background: var(--green); }
    .dot-replicate{ background: var(--amber); }
    .dot-error    { background: var(--red); }
    .dot-info     { background: var(--text-muted); }
    .log-msg  { flex: 1; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .log-time { font-family: var(--font-mono); color: var(--text-muted); flex-shrink: 0; font-size: 10px; }
    .log-empty { font-size: 12px; color: var(--text-muted); text-align: center; padding: 28px 0; }
  `]
})
export class DashboardComponent {
  nodeState = inject(NodeStateService);
  activity  = inject(ActivityService);

  totalOps     = computed(() => this.activity.logs().length);
  uploadCount  = computed(() => this.activity.logs().filter(l => l.type === 'UPLOAD').length);
  downloadCount= computed(() => this.activity.logs().filter(l => l.type === 'DOWNLOAD').length);
}
