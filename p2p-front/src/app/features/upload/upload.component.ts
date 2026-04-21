import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { P2pApiService } from '../../core/services/p2p-api.service';
import { NodeStateService } from '../../core/services/node-state.service';
import { ActivityService } from '../../core/services/activity.service';
import { P2pNode } from '../../core/models';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">Envoyer un fichier</h1>
          <p class="page-sub">Le fichier sera automatiquement répliqué vers tous les nœuds du réseau</p>
        </div>
      </header>

      <!-- Étape 1 : noeud -->
      <div class="card">
        <div class="step-label"><span class="step-num">1</span> Choisir le nœud destinataire</div>
        <div class="node-selector">
          @for (node of nodeState.nodes; track node.id) {
            <button class="node-btn"
                    [class.selected]="selectedNodeId() === node.id"
                    [class.offline]="!nodeState.isOnline(node.id)"
                    [style.--nc]="node.color"
                    (click)="!nodeState.isPending(node.id) && selectedNodeId.set(node.id)">
              <span class="node-dot"
                    [style.background]="nodeState.isOnline(node.id) ? node.color : 'var(--text-muted)'"></span>
              <div>
                <div class="node-btn-name" [style.color]="node.color">{{ node.label }}</div>
                <div class="node-btn-status">
                  @if (nodeState.isPending(node.id)) { Vérification… }
                  @else if (nodeState.isOnline(node.id)) { Disponible }
                  @else { Indisponible }
                </div>
              </div>
              @if (nodeState.isOnline(node.id) && selectedNodeId() === node.id) {
                <span class="selected-check">✓</span>
              }
            </button>
          }
        </div>
      </div>

      <!-- Étape 2 : fichier -->
      <div class="card">
        <div class="step-label"><span class="step-num">2</span> Sélectionner le fichier</div>
        <div class="drop-zone"
             [class.has-file]="selectedFile()"
             [class.dragging]="dragging()"
             (dragover)="onDragOver($event)"
             (dragleave)="dragging.set(false)"
             (drop)="onDrop($event)"
             (click)="fileInput.click()">
          <input #fileInput type="file" style="display:none" (change)="onFileChange($event)" />
          @if (!selectedFile()) {
            <div class="drop-content">
              <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                <path d="M21 6v22M11 16l10-10 10 10" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6 34h30" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <div class="drop-text">Glissez un fichier ici ou cliquez</div>
              <div class="drop-sub">Tous formats acceptés</div>
            </div>
          } @else {
            <div class="file-preview">
              <span class="file-icon">{{ fileIcon(selectedFile()!.name) }}</span>
              <div class="file-info">
                <div class="file-name">{{ selectedFile()!.name }}</div>
                <div class="file-size">{{ formatSize(selectedFile()!.size) }}</div>
              </div>
              <button class="remove-btn" (click)="removeFile($event)">✕</button>
            </div>
          }
        </div>
      </div>

      <!-- Étape 3 : nom -->
      <div class="card">
        <div class="step-label"><span class="step-num">3</span> Nom du fichier (optionnel)</div>
        <input class="text-input" type="text" [(ngModel)]="customFilename"
               [placeholder]="selectedFile()?.name ?? 'Nom du fichier…'"
               [disabled]="!selectedFile()" />
      </div>

      <!-- Bouton -->
      <button class="upload-btn"
              [disabled]="!selectedFile() || uploading() || !selectedNodeId()"
              (click)="upload()">
        @if (uploading()) {
          <span class="spinner"></span> Envoi en cours…
        } @else {
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2v11M4 6l5-4 5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 15h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Envoyer vers {{ nodeLabel() }}
        }
      </button>

      <!-- Résultat -->
      @if (resultMsg()) {
        <div class="result-banner" [class.success]="resultOk()" [class.error]="!resultOk()">
          <span>{{ resultOk() ? '✓' : '✕' }}</span>
          <span>{{ resultMsg() }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 780px; }
    .page-header { margin-bottom: 20px; }
    .page-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: -.02em; }
    .page-sub   { font-size: 13px; color: var(--text-muted); margin-top: 3px; }

    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 12px; }
    .step-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
    .step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

    .node-selector { display: flex; gap: 10px; }
    .node-btn { flex: 1; display: flex; align-items: center; gap: 10px; padding: 13px 14px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg-elevated); cursor: pointer; transition: all .15s; text-align: left; }
    .node-btn:hover:not(.offline) { border-color: var(--nc, var(--border-bright)); }
    .node-btn.selected { border-color: var(--nc, var(--accent)); background: rgba(108,143,255,.05); }
    .node-btn.offline  { opacity: .45; cursor: not-allowed; }
    .node-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; transition: background .3s; }
    .node-btn-name   { font-size: 13px; font-weight: 600; }
    .node-btn-status { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
    .selected-check  { margin-left: auto; color: var(--green); font-weight: 700; font-size: 14px; }

    .drop-zone { border: 1.5px dashed var(--border-bright); border-radius: 10px; padding: 32px; text-align: center; cursor: pointer; transition: all .2s; min-height: 130px; display: flex; align-items: center; justify-content: center; }
    .drop-zone:hover, .drop-zone.dragging { border-color: var(--accent); background: rgba(108,143,255,.04); }
    .drop-zone.has-file { border-style: solid; border-color: var(--accent); padding: 16px; }
    .drop-content { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .drop-text { font-size: 14px; color: var(--text-secondary); }
    .drop-sub  { font-size: 12px; color: var(--text-muted); }

    .file-preview { display: flex; align-items: center; gap: 14px; width: 100%; }
    .file-icon { font-size: 32px; }
    .file-info { flex: 1; text-align: left; }
    .file-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
    .file-size { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .remove-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--border); background: none; color: var(--text-muted); cursor: pointer; font-size: 12px; }
    .remove-btn:hover { color: var(--red); border-color: var(--red); }

    .text-input { width: 100%; padding: 11px 14px; border-radius: 8px; border: 1px solid var(--border-bright); background: var(--bg-elevated); color: var(--text-primary); font-size: 13px; outline: none; transition: border .15s; }
    .text-input:focus { border-color: var(--accent); }
    .text-input:disabled { opacity: .4; cursor: not-allowed; }

    .upload-btn { width: 100%; padding: 14px; border-radius: 10px; border: none; background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; font-family: var(--font-body); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity .15s; margin-bottom: 12px; }
    .upload-btn:hover:not(:disabled) { opacity: .88; }
    .upload-btn:disabled { opacity: .4; cursor: not-allowed; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .result-banner { display: flex; align-items: center; gap: 10px; padding: 13px 16px; border-radius: 10px; font-size: 13px; font-weight: 500; }
    .result-banner.success { background: rgba(52,211,153,.1); color: var(--green); border: 1px solid rgba(52,211,153,.2); }
    .result-banner.error   { background: rgba(248,113,113,.1); color: var(--red);   border: 1px solid rgba(248,113,113,.2); }
  `]
})
export class UploadComponent {
  private api      = inject(P2pApiService);
  nodeState        = inject(NodeStateService);
  private activity = inject(ActivityService);

  selectedNodeId = signal<string>('A');
  selectedFile   = signal<File | null>(null);
  customFilename = '';
  uploading      = signal(false);
  dragging       = signal(false);
  resultMsg      = signal('');
  resultOk       = signal(false);

  nodeLabel = () => this.nodeState.getNodeById(this.selectedNodeId())?.label ?? 'le nœud';

  onFileChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) { this.selectedFile.set(f); this.resultMsg.set(''); }
  }
  onDragOver(e: DragEvent) { e.preventDefault(); this.dragging.set(true); }
  onDrop(e: DragEvent) {
    e.preventDefault(); this.dragging.set(false);
    const f = e.dataTransfer?.files[0];
    if (f) { this.selectedFile.set(f); this.resultMsg.set(''); }
  }
  removeFile(e: Event) { e.stopPropagation(); this.selectedFile.set(null); this.resultMsg.set(''); }

  upload() {
    const file = this.selectedFile();
    const node = this.nodeState.getNodeById(this.selectedNodeId());
    if (!file || !node) return;
    const filename = this.customFilename.trim() || file.name;
    this.uploading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      this.api.uploadFile(node, filename, reader.result as ArrayBuffer).subscribe({
        next: () => {
          this.uploading.set(false);
          this.resultMsg.set(`"${filename}" envoyé avec succès vers ${node.label} — réplication automatique déclenchée`);
          this.resultOk.set(true);
          this.activity.upload(filename, node.label, true);
          this.nodeState.getPeerNodes(node.id).forEach(p => this.activity.replicate(filename, node.label, p.label, true));
        },
        error: (err) => {
          this.uploading.set(false);
          this.resultMsg.set(`Échec de l'envoi vers ${node.label}` + (err?.status ? ` (${err.status})` : ''));
          this.resultOk.set(false);
          this.activity.upload(filename, node.label, false);
        }
      });
    };
    reader.readAsArrayBuffer(file);
  }

  fileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const m: Record<string, string> = { pdf:'📄', txt:'📃', csv:'📊', zip:'📦', gz:'📦', png:'🖼️', jpg:'🖼️', mp4:'🎬', mp3:'🎵', json:'📋', docx:'📝', xlsx:'📊' };
    return m[ext] ?? '📁';
  }

  formatSize(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024**2) return `${(b/1024).toFixed(1)} KB`;
    return `${(b/1024**2).toFixed(1)} MB`;
  }
}
