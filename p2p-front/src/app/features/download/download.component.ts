import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { P2pApiService } from '../../core/services/p2p-api.service';
import { NodeStateService } from '../../core/services/node-state.service';
import { ActivityService } from '../../core/services/activity.service';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">Récupérer un fichier</h1>
          <p class="page-sub">Si le fichier est absent sur le nœud choisi, le système le recherche automatiquement sur les autres nœuds</p>
        </div>
      </header>

      <!-- Sélection noeud -->
      <div class="card">
        <div class="step-label"><span class="step-num">1</span> Choisir le nœud source</div>
        <div class="node-selector">
          @for (node of nodeState.nodes; track node.id) {
            <button class="node-btn"
                    [class.selected]="selectedNodeId() === node.id"
                    [class.offline]="!nodeState.isOnline(node.id)"
                    [style.--nc]="node.color"
                    (click)="selectedNodeId.set(node.id)">
              <span class="node-dot" [style.background]="nodeState.isOnline(node.id) ? node.color : 'var(--text-muted)'"></span>
              <div>
                <div class="node-btn-name" [style.color]="node.color">{{ node.label }}</div>
                <div class="node-btn-peers">
                  Pairs :
                  @for (p of nodeState.getPeerNodes(node.id); track p.id) {
                    <span [style.color]="p.color">{{ p.label }}</span>
                  }
                </div>
              </div>
            </button>
          }
        </div>
        <div class="info-note">
          Si le fichier est absent sur le nœud sélectionné, il sera automatiquement recherché chez ses pairs.
        </div>
      </div>

      <!-- Nom du fichier -->
      <div class="card">
        <div class="step-label"><span class="step-num">2</span> Nom du fichier</div>
        <input class="text-input" type="text" [(ngModel)]="filename"
               placeholder="Ex : rapport.pdf, photo.jpg, donnees.csv"
               (keydown.enter)="download()" />
      </div>

      <!-- Bouton -->
      <button class="dl-btn"
              [disabled]="!filename.trim() || downloading()"
              (click)="download()">
        @if (downloading()) {
          <span class="spinner"></span> Récupération en cours…
        } @else {
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2v11M4 10l5 4 5-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 15h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Télécharger "{{ filename || '…' }}"
        }
      </button>

      <!-- Résultat -->
      @if (resultMsg()) {
        <div class="result-banner" [class.success]="resultOk()" [class.error]="!resultOk()">
          <span>{{ resultOk() ? '✓' : '✕' }}</span>
          <span>{{ resultMsg() }}</span>
        </div>
      }

      <!-- Historique -->
      @if (history().length > 0) {
        <div class="card" style="margin-top:16px">
          <div class="card-title-row">
            <span class="card-title">Historique de la session</span>
            <button class="clear-btn" (click)="history.set([])">Effacer</button>
          </div>
          <div class="history-list">
            @for (h of history(); track h.id) {
              <div class="history-item" [class.success]="h.success" [class.error]="!h.success">
                <span class="h-icon">{{ h.success ? '✓' : '✕' }}</span>
                <span class="h-file">{{ h.filename }}</span>
                <span class="h-node">{{ h.nodeLabel }}</span>
                <span class="h-time">{{ h.time | date:'HH:mm:ss' }}</span>
                @if (h.success) {
                  <button class="re-btn" (click)="redownload(h.filename, h.nodeId)">↓</button>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 780px; }
    .page-header { margin-bottom: 20px; }
    .page-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: -.02em; }
    .page-sub   { font-size: 13px; color: var(--text-muted); margin-top: 3px; max-width: 500px; line-height: 1.5; }

    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 12px; }
    .step-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
    .step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--green); color: #0a0a0f; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .card-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .card-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .clear-btn { font-size: 11px; color: var(--text-muted); background: none; border: none; cursor: pointer; }

    .node-selector { display: flex; gap: 10px; margin-bottom: 10px; }
    .node-btn { flex: 1; display: flex; align-items: flex-start; gap: 10px; padding: 13px 14px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg-elevated); cursor: pointer; transition: all .15s; text-align: left; }
    .node-btn:hover:not(.offline) { border-color: var(--nc, var(--border-bright)); }
    .node-btn.selected { border-color: var(--nc, var(--green)); }
    .node-btn.offline  { opacity: .45; cursor: not-allowed; }
    .node-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; transition: background .3s; }
    .node-btn-name  { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
    .node-btn-peers { font-size: 11px; color: var(--text-muted); display: flex; gap: 5px; }
    .node-btn-peers span { font-weight: 600; }

    .info-note { font-size: 12px; color: var(--text-muted); background: rgba(52,211,153,.06); border-left: 3px solid var(--green); padding: 8px 12px; border-radius: 0 6px 6px 0; }

    .text-input { width: 100%; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--border-bright); background: var(--bg-elevated); color: var(--text-primary); font-size: 14px; outline: none; transition: border .15s; }
    .text-input:focus { border-color: var(--green); }

    .dl-btn { width: 100%; padding: 14px; border-radius: 10px; border: none; background: var(--green); color: #0a0a0f; font-size: 14px; font-weight: 700; font-family: var(--font-body); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity .15s; margin-bottom: 12px; }
    .dl-btn:hover:not(:disabled) { opacity: .85; }
    .dl-btn:disabled { opacity: .4; cursor: not-allowed; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(0,0,0,.2); border-top-color: #0a0a0f; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .result-banner { display: flex; align-items: center; gap: 10px; padding: 13px 16px; border-radius: 10px; font-size: 13px; font-weight: 500; margin-bottom: 12px; }
    .result-banner.success { background: rgba(52,211,153,.1); color: var(--green); border: 1px solid rgba(52,211,153,.2); }
    .result-banner.error   { background: rgba(248,113,113,.1); color: var(--red);   border: 1px solid rgba(248,113,113,.2); }

    .history-list { display: flex; flex-direction: column; gap: 6px; }
    .history-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; background: var(--bg-elevated); font-size: 12px; }
    .h-icon { font-weight: 700; flex-shrink: 0; }
    .history-item.success .h-icon { color: var(--green); }
    .history-item.error   .h-icon { color: var(--red); }
    .h-file { flex: 1; font-family: var(--font-mono); color: var(--text-secondary); }
    .h-node { color: var(--text-muted); }
    .h-time { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
    .re-btn { padding: 3px 9px; border-radius: 4px; border: 1px solid var(--border); background: none; color: var(--green); cursor: pointer; font-size: 12px; }
    .re-btn:hover { background: rgba(52,211,153,.1); }
  `]
})
export class DownloadComponent {
  private api      = inject(P2pApiService);
  nodeState        = inject(NodeStateService);
  private activity = inject(ActivityService);

  selectedNodeId = signal<string>('A');
  filename       = '';
  downloading    = signal(false);
  resultMsg      = signal('');
  resultOk       = signal(false);
  history        = signal<{id:string;filename:string;nodeId:string;nodeLabel:string;time:Date;success:boolean}[]>([]);

  download() {
    const name = this.filename.trim();
    const node = this.nodeState.getNodeById(this.selectedNodeId());
    if (!name || !node) return;
    this.downloading.set(true);
    this.resultMsg.set('');

    this.api.downloadFile(node, name).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        this.resultMsg.set(`"${name}" téléchargé avec succès depuis ${node.label} (${this.formatSize(blob.size)})`);
        this.resultOk.set(true);
        this.activity.download(name, node.label, true);
        this.addHistory(name, node, true);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.downloading.set(false);
        const msg = err?.status === 500
          ? `"${name}" introuvable sur ${node.label} et ses pairs`
          : `Erreur lors du téléchargement`;
        this.resultMsg.set(msg);
        this.resultOk.set(false);
        this.activity.download(name, node.label, false);
        this.addHistory(name, node, false);
      }
    });
  }

  redownload(filename: string, nodeId: string) {
    this.filename = filename;
    this.selectedNodeId.set(nodeId);
    this.download();
  }

  private addHistory(filename: string, node: any, success: boolean) {
    this.history.update(h => [{ id: Date.now().toString(), filename, nodeId: node.id, nodeLabel: node.label, time: new Date(), success }, ...h].slice(0, 20));
  }

  formatSize(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024**2) return `${(b/1024).toFixed(1)} KB`;
    return `${(b/1024**2).toFixed(1)} MB`;
  }
}
