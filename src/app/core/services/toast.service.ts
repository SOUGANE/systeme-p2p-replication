import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast: Toast = {
      id: Date.now().toString(),
      message,
      type,
      icon: icons[type],
    };
    this._toasts.update(t => [toast, ...t]);
    setTimeout(() => this.dismiss(toast.id), 4000);
  }

  dismiss(id: string): void {
    this._toasts.update(t => t.filter(toast => toast.id !== id));
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string)   { this.show(msg, 'error'); }
  info(msg: string)    { this.show(msg, 'info'); }
}
