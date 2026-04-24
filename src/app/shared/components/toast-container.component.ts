import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}" (click)="toastService.dismiss(toast.id)">
          <span class="toast-icon">{{ toast.icon }}</span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button class="toast-close">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .toast {
      padding: 14px 16px;
      border-radius: var(--radius-md);
      background: var(--bg-sidebar);
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      font-size: 13.5px;
      max-width: 340px;
      pointer-events: all;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: fadeInUp 0.3s ease both;
      color: var(--cream);
      font-family: var(--font-body);
    }
    .toast-success { border-left: 3px solid var(--teal); }
    .toast-error   { border-left: 3px solid var(--coral); }
    .toast-info    { border-left: 3px solid var(--amber); }

    .toast-icon {
      font-size: 15px;
      flex-shrink: 0;
    }
    .toast-success .toast-icon { color: var(--teal); }
    .toast-error .toast-icon   { color: var(--coral); }
    .toast-info .toast-icon    { color: var(--amber); }

    .toast-msg { flex: 1; line-height: 1.4; }
    .toast-close {
      background: none;
      border: none;
      color: rgba(250,240,230,0.4);
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 0;
      flex-shrink: 0;
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
