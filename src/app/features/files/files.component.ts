import {
  Component, inject, signal, computed, ElementRef, ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../core/services/file.service';
import { NodeService } from '../../core/services/node.service';
import { ToastService } from '../../core/services/toast.service';
import { FileInfo, P2PNode } from '../../core/models/models';

@Component({
  selector: 'app-files',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="files-page">
      <div class="page-header">
        <div>
          <h1>Gestion des fichiers</h1>
          <p>Uploadez, téléchargez et répliquez des fichiers à travers le réseau P2P.</p>
        </div>
      </div>

      <!-- Active Node Selector -->
      <div class="node-selector-bar animate-fade-in-up">
        <span class="nsb-label">Nœud cible :</span>
        @for (node of nodeService.nodes(); track node.id) {
          <button
            class="node-tab"
            [class.active]="selectedNodeId() === node.id"
            (click)="loadFilesFromNode(node.id)"
          >
            <span class="ndot"
              [class.online]="node.status === 'online'"
              [class.offline]="node.status === 'offline'"
              [class.checking]="node.status === 'checking'">
            </span>
            {{ node.name }}
            <span class="mono" style="font-size:11px; opacity:0.6">:{{ node.port }}</span>
          </button>
        }
      </div>

      <div class="files-layout">
        <!-- Upload Panel -->
        <div class="upload-panel animate-fade-in-up" style="animation-delay:80ms">
          <div class="card">
            <div class="card-header">
              <h3>⬆️ Upload de fichier</h3>
            </div>
            <div class="card-body">
              <!-- Drop zone -->
              <div
                class="drop-zone"
                [class.drag-over]="isDragOver()"
                [class.has-file]="selectedFile()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave()"
                (drop)="onDrop($event)"
                (click)="fileInput.click()"
              >
                <input #fileInput type="file" hidden (change)="onFileSelected($event)" multiple/>
                @if (selectedFile()) {
                  <div class="dz-file-info">
                    <div class="dz-file-icon">📄</div>
                    <div class="dz-file-name">{{ selectedFile()!.name }}</div>
                    <div class="dz-file-size mono">{{ fileService.formatBytes(selectedFile()!.size) }}</div>
                  </div>
                } @else {
                  <div class="dz-placeholder">
                    <div class="dz-icon">
                      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M24 32V16M17 23l7-7 7 7"/>
                        <path d="M8 40h32"/>
                        <rect x="6" y="8" width="36" height="32" rx="4"/>
                      </svg>
                    </div>
                    <p class="dz-title">Glissez un fichier ici</p>
                    <p class="dz-sub">ou cliquez pour sélectionner</p>
                  </div>
                }
              </div>

              <!-- Target node -->
              <div class="form-group mt-12">
                <label>Nœud destinataire</label>
                <select [(ngModel)]="uploadTargetNodeId">
                  @for (node of nodeService.nodes(); track node.id) {
                    <option [value]="node.id">
                      {{ node.name }} (localhost:{{ node.port }})
                      {{ node.status === 'offline' ? ' — HORS LIGNE' : '' }}
                    </option>
                  }
                </select>
              </div>

              <button
                class="btn btn-primary upload-btn"
                (click)="uploadFile()"
                [disabled]="!selectedFile() || fileService.uploading()"
              >
                @if (fileService.uploading()) {
                  <span class="spinner"></span>
                  Upload en cours…
                } @else {
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                  </svg>
                  Uploader
                }
              </button>
            </div>
          </div>

          <!-- Check local file -->
          <div class="card mt-16">
            <div class="card-header">
              <h3>🔍 Vérification locale</h3>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label>Nom du fichier</label>
                <input [(ngModel)]="checkFilename" placeholder="ex: rapport.pdf" type="text"/>
              </div>
              <div class="form-group">
                <label>Nœud à vérifier</label>
                <select [(ngModel)]="checkNodeId">
                  @for (node of nodeService.nodes(); track node.id) {
                    <option [value]="node.id">{{ node.name }} :{{ node.port }}</option>
                  }
                </select>
              </div>
              <button class="btn btn-secondary" (click)="checkLocal()" [disabled]="!checkFilename.trim()">
                Vérifier
              </button>
              @if (checkResult() !== null) {
                <div class="check-result" [class.found]="checkResult()" [class.not-found]="!checkResult()">
                  @if (checkResult()) {
                    ✅ Fichier trouvé localement sur ce nœud
                  } @else {
                    ❌ Fichier non trouvé localement
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Files Table -->
        <div class="files-table-panel animate-fade-in-up" style="animation-delay:160ms">
          <div class="card">
            <div class="card-header">
              <h3>📂 Fichiers suivis — {{ selectedNodeName() }}</h3>
              <div class="header-actions">
                <div class="search-wrap">
                  <input
                    [(ngModel)]="searchQuery"
                    placeholder="Rechercher…"
                    class="search-input"
                    type="text"
                  />
                </div>
              </div>
            </div>
            <div class="table-wrapper">
              <table class="p2p-table">
                <thead>
                  <tr>
                    <th>Fichier</th>
                    <th>Taille</th>
                    <th>Nœud</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (file of filteredFiles(); track file.name + file.nodePort) {
                    <tr>
                      <td>
                        <div class="file-name-cell">
                          <span class="file-icon">{{ getFileIcon(file.name) }}</span>
                          <span class="mono-cell">{{ file.name }}</span>
                        </div>
                      </td>
                      <td class="mono-cell">{{ file.size ? fileService.formatBytes(file.size) : '—' }}</td>
                      <td>
                        <span class="badge badge--info mono">{{ file.nodeName }} :{{ file.nodePort }}</span>
                      </td>
                      <td class="mono-cell" style="font-size:11.5px; color:var(--text-muted)">
                        {{ file.uploadedAt ? formatDate(file.uploadedAt) : '—' }}
                      </td>
                      <td>
                        <div class="row-actions">
                          <button class="btn btn-sm btn-teal" (click)="downloadFile(file)" title="Télécharger">
                            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                            </svg>
                            DL
                          </button>
                          <button class="btn btn-sm btn-secondary" (click)="openReplicateModal(file)" title="Répliquer">
                            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                              <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"/>
                              <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z"/>
                            </svg>
                            Répliquer
                          </button>
                          <button class="btn btn-sm btn-danger" (click)="removeFile(file)" title="Retirer du suivi">
                            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5">
                        <div class="empty-state">
                          <div class="empty-icon">📭</div>
                          <h4>Aucun fichier suivi</h4>
                          <p>Uploadez un fichier pour qu'il apparaisse ici.</p>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- All files across nodes -->
          @if (nodeService.nodes().length > 1) {
            <div class="card mt-20">
              <div class="card-header">
                <h3>🌐 Vue globale — Tous les nœuds</h3>
                <span class="mono" style="font-size:12px; color:var(--text-muted)">{{ fileService.getAllFiles().length }} fichiers</span>
              </div>
              <div class="table-wrapper">
                <table class="p2p-table">
                  <thead>
                    <tr>
                      <th>Fichier</th>
                      <th>Nœud</th>
                      <th>Taille</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (file of fileService.getAllFiles(); track file.name + file.nodePort) {
                      <tr>
                        <td class="mono-cell">{{ file.name }}</td>
                        <td>
                          <span class="badge badge--info mono">{{ file.nodeName }} :{{ file.nodePort }}</span>
                        </td>
                        <td class="mono-cell">{{ file.size ? fileService.formatBytes(file.size) : '—' }}</td>
                        <td>
                          <button class="btn btn-sm btn-teal" (click)="downloadFileGlobal(file)">↓ DL</button>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4">
                          <div class="empty-state" style="padding:30px">
                            <p style="color:var(--text-muted); font-size:13px">Aucun fichier sur le réseau.</p>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Replicate Modal -->
      @if (replicateModalOpen()) {
        <div class="modal-backdrop" (click)="closeReplicateModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>⟳ Répliquer le fichier</h3>
              <button class="btn btn-icon btn-secondary" (click)="closeReplicateModal()">×</button>
            </div>
            <div class="modal-body">
              <p class="modal-desc">
                Copier <strong class="mono">{{ replicateTarget()?.name }}</strong>
                depuis <strong>{{ getNodeById(replicateTarget()?.nodePort)?.name }}</strong>
                vers un autre nœud.
              </p>
              <div class="form-group mt-16">
                <label>Nœud destinataire</label>
                <select [(ngModel)]="replicateDestNodeId">
                  @for (node of availableReplicateNodes(); track node.id) {
                    <option [value]="node.id">{{ node.name }} (localhost:{{ node.port }})</option>
                  }
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeReplicateModal()">Annuler</button>
              <button class="btn btn-primary" (click)="executeReplicate()" [disabled]="replicating()">
                @if (replicating()) {
                  <span class="spinner"></span> Réplication…
                } @else {
                  ⟳ Répliquer
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .files-page {
      padding: 36px 40px;
      max-width: 1300px;
    }

    /* Node selector bar */
    .node-selector-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .nsb-label {
      font-family: var(--font-display);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .node-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 100px;
      border: 1.5px solid var(--border-strong);
      background: var(--bg-card);
      cursor: pointer;
      font-family: var(--font-display);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      transition: var(--transition);
      &:hover { border-color: var(--amber); color: var(--text-primary); }
      &.active { border-color: var(--amber); background: rgba(242,169,59,0.1); color: var(--amber-dark); }
    }
    .ndot {
      width: 7px; height: 7px;
      border-radius: 50%;
      &.online  { background: var(--teal); }
      &.offline { background: var(--coral); }
      &.checking{ background: var(--amber); }
    }

    /* Layout */
    .files-layout {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 24px;
      align-items: start;
    }

    /* Drop zone */
    .drop-zone {
      border: 2px dashed var(--border-strong);
      border-radius: var(--radius-md);
      padding: 32px 24px;
      text-align: center;
      cursor: pointer;
      transition: var(--transition);
      background: var(--bg-primary);
      min-height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover, &.drag-over {
        border-color: var(--amber);
        background: rgba(242,169,59,0.06);
      }
      &.has-file {
        border-style: solid;
        border-color: var(--teal);
        background: rgba(92,158,143,0.05);
      }
    }
    .dz-placeholder {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .dz-icon svg {
      width: 40px; height: 40px;
      color: var(--amber);
    }
    .dz-title { font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--text-secondary); }
    .dz-sub   { font-size: 12px; color: var(--text-muted); }

    .dz-file-info {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .dz-file-icon { font-size: 32px; }
    .dz-file-name { font-family: var(--font-mono); font-size: 13px; font-weight: 500; }
    .dz-file-size { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }

    .upload-btn { width: 100%; justify-content: center; margin-top: 16px; }
    .mt-12 { margin-top: 12px; }
    .mt-16 { margin-top: 16px; }
    .mt-20 { margin-top: 20px; }

    /* Check result */
    .check-result {
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-family: var(--font-display);
      font-weight: 600;
      &.found     { background: rgba(92,158,143,0.1); color: var(--teal-dark); border: 1px solid rgba(92,158,143,0.3); }
      &.not-found { background: rgba(224,92,92,0.08); color: var(--coral-dark); border: 1px solid rgba(224,92,92,0.25); }
    }

    /* Files table */
    .header-actions { display: flex; gap: 10px; align-items: center; }
    .search-input {
      padding: 7px 14px;
      border-radius: var(--radius-sm);
      border: 1.5px solid var(--border-strong);
      background: var(--bg-primary);
      font-family: var(--font-mono);
      font-size: 12.5px;
      outline: none;
      &:focus { border-color: var(--amber); }
      &::placeholder { color: var(--text-muted); }
    }

    .file-name-cell {
      display: flex; align-items: center; gap: 8px;
    }
    .file-icon { font-size: 16px; }
    .row-actions { display: flex; gap: 6px; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(28,26,23,0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    .modal {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      width: 440px;
      animation: fadeInUp 0.3s ease;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border);
      h3 { font-size: 16px; font-weight: 700; }
    }
    .modal-body  { padding: 20px 24px; }
    .modal-footer {
      padding: 16px 24px 20px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid var(--border);
    }
    .modal-desc {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    @media (max-width: 1000px) {
      .files-layout { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .files-page { padding: 20px; }
    }
  `]
})
export class FilesComponent {
  fileService = inject(FileService);
  nodeService = inject(NodeService);
  toast = inject(ToastService);

  selectedNodeId = signal(this.nodeService.activeNode().id);
  searchQuery = '';
  uploadTargetNodeId = this.nodeService.activeNode().id;
  checkFilename = '';
  checkNodeId = this.nodeService.activeNode().id;
  checkResult = signal<boolean | null>(null);

  isDragOver = signal(false);
  selectedFile = signal<File | null>(null);

  replicateModalOpen = signal(false);
  replicateTarget = signal<FileInfo | null>(null);
  replicateDestNodeId = '';
  replicating = signal(false);

  selectedNodeName = computed(() => {
    const node = this.nodeService.nodes().find(n => n.id === this.selectedNodeId());
    return node ? `${node.name} (port ${node.port})` : '';
  });

  filteredFiles = computed(() => {
    const files = this.fileService.getFilesForNode(this.selectedNodeId());
    if (!this.searchQuery.trim()) return files;
    const q = this.searchQuery.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(q));
  });

  availableReplicateNodes = computed(() => {
    const target = this.replicateTarget();
    if (!target) return [];
    return this.nodeService.nodes().filter(n => n.port !== target.nodePort);
  });

 

  // ── Ajout de cette methode pour l'utilisation de l'API GET /files/internal/list  ── 
loadFilesFromNode(nodeId: string): void {
  // 1. Mettre à jour le nœud sélectionné
  this.selectedNodeId.set(nodeId);
  
  // 2. Trouver le nœud correspondant
  const node = this.nodeService.nodes().find(n => n.id === nodeId);
  if (!node) {
    this.toast.error('Nœud non trouvé');
    return;
  }
  
  // 3. Afficher un indicateur de chargement (optionnel)
  this.toast.info(`Chargement des fichiers depuis ${node.name}...`);
  
  // 4. Appeler le service pour charger les fichiers
  this.fileService.loadFilesFromNode(node);
  
  // 5. Optionnel : afficher un message de succès après un court délai
  setTimeout(() => {
    const filesCount = this.fileService.getFilesForNode(nodeId).length;
    this.toast.success(`${filesCount} fichier(s) chargé(s) depuis ${node.name}`);
  }, 500);
}
  

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }
  onDragLeave(): void { this.isDragOver.set(false); }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.selectedFile.set(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.selectedFile.set(file);
  }

  // Appel du service de l'API  ── POST /files/{filename} ─────────────
  uploadFile(): void {
    const file = this.selectedFile();
    if (!file) return;

    const targetNode = this.nodeService.nodes().find(n => n.id === this.uploadTargetNodeId);
    if (!targetNode) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as ArrayBuffer;
      this.fileService.uploadFile(targetNode, file.name, data).subscribe({
        next: () => {
          this.toast.success(`"${file.name}" uploadé avec succès sur ${targetNode.name}`);
          this.selectedFile.set(null);
        },
        error: (err) => {
          this.toast.error(`Erreur upload: ${err.message || 'Nœud inaccessible'}`);
        }
      });
    };
    reader.readAsArrayBuffer(file);
  }
  
  // Appel du service de l'API pour le télépchargement ── GET /files/{filename} ────────────
  downloadFile(file: FileInfo): void {
    const node = this.nodeService.nodes().find(n => n.port === file.nodePort);
    if (!node) return;
    this.fileService.downloadFile(node, file.name).subscribe({
      next: (data) => {
        this.fileService.triggerDownload(data, file.name);
        this.toast.success(`"${file.name}" téléchargé.`);
      },
      error: () => this.toast.error('Erreur téléchargement.')
    });
  }

  downloadFileGlobal(file: FileInfo): void {
    this.downloadFile(file);
  }

   // faire appel au service file.service pour l'API  ── GET /files/internal/local/{filename} ──────
    
  checkLocal(): void {
  if (!this.checkFilename.trim()) {
    this.toast.info('Veuillez entrer un nom de fichier');
    return;
  }
  
  const node = this.nodeService.nodes().find(n => n.id === this.checkNodeId);
  if (!node) {
    this.toast.error('Nœud non trouvé');
    return;
  }
  
  // Reset result and show loading state
  this.checkResult.set(null);
  this.toast.info(`Vérification de "${this.checkFilename}" sur ${node.name}...`);
  
  // CORRECTION : Bien gérer l'Observable<boolean> retourné
  this.fileService.checkLocalFile(node, this.checkFilename).subscribe({
    next: (found: boolean) => {
      // Maintenant found est un boolean explicite, pas un ArrayBuffer
      this.checkResult.set(found);
      
      if (found) {
        this.toast.success(`✅ "${this.checkFilename}" trouvé sur ${node.name}`);
      } else {
        this.toast.error(`❌ "${this.checkFilename}" non trouvé sur ${node.name}`);
      }
    },
    error: (err) => {
      // En cas d'erreur HTTP, on considère que le fichier n'est pas trouvé
      console.error('Erreur lors de la vérification:', err);
      this.checkResult.set(false);
      this.toast.error(`❌ Erreur de vérification pour "${this.checkFilename}"`);
    }
  });
}



  openReplicateModal(file: FileInfo): void {
    this.replicateTarget.set(file);
    const others = this.nodeService.nodes().filter(n => n.port !== file.nodePort);
    this.replicateDestNodeId = others[0]?.id ?? '';
    this.replicateModalOpen.set(true);
  }

  closeReplicateModal(): void {
    this.replicateModalOpen.set(false);
    this.replicateTarget.set(null);
  }

  executeReplicate(): void {
    const file = this.replicateTarget();
    const destNode = this.nodeService.nodes().find(n => n.id === this.replicateDestNodeId);
    const srcNode = this.nodeService.nodes().find(n => n.port === file?.nodePort);
    if (!file || !destNode || !srcNode) return;

    this.replicating.set(true);
    this.fileService.replicateFile(srcNode, destNode, file.name).subscribe({
      next: () => {
        this.toast.success(`"${file.name}" répliqué vers ${destNode.name} avec succès !`);
        this.replicating.set(false);
        this.closeReplicateModal();
      },
      error: () => {
        this.toast.error('Échec de la réplication.');
        this.replicating.set(false);
      }
    });
  }

  removeFile(file: FileInfo): void {
    const node = this.nodeService.nodes().find(n => n.port === file.nodePort);
    if (!node) return;
    this.fileService.removeFileFromCache(node.id, file.name);
    this.toast.info(`"${file.name}" retiré du suivi.`);
  }

  getNodeById(port?: number): P2PNode | undefined {
    return this.nodeService.nodes().find(n => n.port === port);
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const icons: Record<string, string> = {
      pdf: '📄', txt: '📝', jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
      gif: '🖼️', mp4: '🎬', mp3: '🎵', zip: '📦', json: '📋',
      csv: '📊', xlsx: '📊', doc: '📝', docx: '📝', js: '⚙️',
      ts: '⚙️', java: '☕', py: '🐍', html: '🌐',
    };
    return icons[ext] ?? '📄';
  }

  formatDate(date: Date): string {
    return date.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
