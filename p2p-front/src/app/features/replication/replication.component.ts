import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { P2pApiService } from '../../core/services/p2p-api.service';
import { NodeStateService } from '../../core/services/node-state.service';
import { ActivityService } from '../../core/services/activity.service';
import { FileCheckResult } from '../../core/models';

@Component({
  selector: 'app-replication',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">Vérification de réplication</h1>
          <p class="page-sub">Contrôlez la présence d'un fichier sur les 3 nœuds du réseau</p>
        </div>
      </header>

      <!-- Recherche -->
      <div class="card">
        <div class="step-label"><span class="step-num">1</span> Nom du fichier à vérifier</div>
        <div class="search-row">
          <input class="text-input" type="text" [(ngModel)]="filename"
                 placeholder="Ex : rapport.pdf, image.png, donnees.csv"
                 (keydown.enter)="checkAll()" />
          <button class="check-btn" [disabled]="!filename.trim() || checking()" (click)="checkAll()">
            @if (checking()) { <span class="spinner"></span> Vérification… }
            @else { Vérifier sur les 3 nœuds }
          </button>
        </div>
      </div>

      <!-- Résultats -->
      @if (results().length > 0) {
        <div class="results-grid">
          @for (r of results(); track r.nodeId) {
            <div class="result-node" [class.has-file]="r.hasFile" [class.missing]="!r.hasFile">
              <div class="rn-header">
                <span class="rn-dot" [style.background]="nodeColor(r.nodeId)"></span>
                <span class="rn-label" [style.color]="nodeColor(r.nodeId)">{{ r.nodeLabel }}</span>
              </div>
              <div class="rn-icon">{{ r.hasFile ? '✓' : '✕' }}</div>
              <div class="rn-status">{{ r.hasFile ? 'Fichier présent' : 'Fichier absent' }}</div>
              <div class="rn-time">Vérifié à {{ r.checkedAt | date:'HH:mm:ss' }}</div>

              @if (!r.hasFile) {
                <button class="replicate-btn" (click)="manualReplicate(r.nodeId)">
                  Répliquer ici →
                </button>
              }
            </div>
          }
        </div>

        <!-- Résumé -->
        <div class="summary" [class.full]="presentCount() === 3"
             [class.partial]="presentCount() > 0 && presentCount() < 3"
             [class.none]="presentCount() === 0">
          <span class="summary-icon">{{ presentCount() === 3 ? '✓' : presentCount() > 0 ? '⚠' : '✕' }}</span>
          <span>
            <b>"{{ filename }}"</b> est présent sur
            <b>{{ presentCount() }}/3</b> nœuds
            @if (presentCount() === 3) { — Réplication complète }
            @else if (presentCount() > 0) { — Réplication incomplète }
            @else { — Fichier introuvable sur le réseau }
          </span>
        </div>
      }

      <!-- Statut réplication manuelle -->
      @if (replicateStatus()) {
        <div class="replicate-banner" [class.success]="replicateOk()" [class.error]="!replicateOk()">
          {{ replicateStatus() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; }
    .page-header { margin-bottom: 20px; }
    .page-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: -.02em; }
    .page-sub   { font-size: 13px; color: var(--text-muted); margin-top: 3px; }

    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 14px; }
    .step-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
    .step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

    .search-row { display: flex; gap: 10px; }
    .text-input { flex: 1; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--border-bright); background: var(--bg-elevated); color: var(--text-primary); font-size: 14px; outline: none; transition: border .15s; }
    .text-input:focus { border-color: var(--accent); }
    .check-btn { padding: 12px 20px; border-radius: 8px; border: none; background: var(--accent); color: #fff; font-size: 13px; font-weight: 600; font-family: var(--font-body); cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap; transition: opacity .15s; }
    .check-btn:hover:not(:disabled) { opacity: .88; }
    .check-btn:disabled { opacity: .45; cursor: not-allowed; }
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .results-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
    .result-node { background: var(--bg-surface); border: 2px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; transition: border-color .3s; }
    .result-node.has-file { border-color: rgba(52,211,153,.4); }
    .result-node.missing  { border-color: rgba(248,113,113,.25); }
    .rn-header { display: flex; align-items: center; justify-content: center; gap: 7px; margin-bottom: 16px; }
    .rn-dot  { width: 9px; height: 9px; border-radius: 50%; }
    .rn-label{ font-weight: 700; font-size: 15px; }
    .rn-icon { font-size: 38px; font-weight: 700; margin: 4px 0 8px; }
    .has-file .rn-icon { color: var(--green); }
    .missing  .rn-icon { color: var(--red); }
    .rn-status { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .has-file .rn-status { color: var(--green); }
    .missing  .rn-status { color: var(--red); }
    .rn-time  { font-size: 11px; color: var(--text-muted); margin-bottom: 12px; }

    .replicate-btn { width: 100%; padding: 8px; border-radius: 7px; border: 1px dashed var(--amber); background: rgba(251,191,36,.07); color: var(--amber); font-size: 12px; font-family: var(--font-body); cursor: pointer; transition: background .15s; }
    .replicate-btn:hover { background: rgba(251,191,36,.15); }

    .summary { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-radius: 10px; font-size: 13px; margin-bottom: 12px; }
    .summary b { font-weight: 600; }
    .summary.full    { background: rgba(52,211,153,.1);  border: 1px solid rgba(52,211,153,.2);  color: var(--green); }
    .summary.partial { background: rgba(251,191,36,.1);  border: 1px solid rgba(251,191,36,.2);  color: var(--amber); }
    .summary.none    { background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.2); color: var(--red); }
    .summary-icon { font-size: 18px; font-weight: 700; flex-shrink: 0; }

    .replicate-banner { padding: 12px 16px; border-radius: 10px; font-size: 13px; }
    .replicate-banner.success { background: rgba(52,211,153,.1); color: var(--green); border: 1px solid rgba(52,211,153,.2); }
    .replicate-banner.error   { background: rgba(248,113,113,.1); color: var(--red);   border: 1px solid rgba(248,113,113,.2); }
  `]
})
export class ReplicationComponent {
  private api      = inject(P2pApiService);
  nodeState        = inject(NodeStateService);
  private activity = inject(ActivityService);

  filename        = '';
  checking        = signal(false);
  results         = signal<FileCheckResult[]>([]);
  replicateStatus = signal('');
  replicateOk     = signal(false);

  presentCount = () => this.results().filter(r => r.hasFile).length;
  nodeColor    = (id: string) => this.nodeState.getNodeById(id)?.color ?? '#fff';

  checkAll() {
    const name = this.filename.trim();
    if (!name) return;
    this.checking.set(true);
    this.results.set([]);
    this.replicateStatus.set('');

    forkJoin(this.nodeState.nodes.map(n => this.api.checkFileLocal(n, name))).subscribe({
      next: results => {
        this.checking.set(false);
        this.results.set(results);
        this.activity.log('SEARCH', `Vérification "${name}" : ${results.filter(r => r.hasFile).length}/3 nœuds`, { filename: name, success: results.some(r => r.hasFile) });
      },
      error: () => { this.checking.set(false); }
    });
  }

  manualReplicate(targetNodeId: string) {
    const source = this.results().find(r => r.hasFile);
    if (!source) return;
    const srcNode = this.nodeState.getNodeById(source.nodeId);
    const tgtNode = this.nodeState.getNodeById(targetNodeId);
    if (!srcNode || !tgtNode) return;

    this.api.downloadFile(srcNode, this.filename).subscribe({
      next: blob => {
        blob.arrayBuffer().then(buf => {
          this.api.replicateFile(tgtNode, this.filename, buf).subscribe({
            next: () => {
              this.replicateStatus.set(`✓ "${this.filename}" répliqué avec succès vers ${tgtNode.label}`);
              this.replicateOk.set(true);
              this.activity.replicate(this.filename, srcNode.label, tgtNode.label, true);
              setTimeout(() => this.checkAll(), 600);
            },
            error: () => { this.replicateStatus.set(`✕ Échec de la réplication vers ${tgtNode.label}`); this.replicateOk.set(false); }
          });
        });
      },
      error: () => { this.replicateStatus.set('✕ Impossible de lire le fichier source'); this.replicateOk.set(false); }
    });
  }
}
