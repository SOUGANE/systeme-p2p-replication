import { Injectable, signal } from '@angular/core';
import { ActivityLog } from '../models';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private _logs = signal<ActivityLog[]>([]);
  readonly logs = this._logs.asReadonly();

  private nextId = 1;

  log(
    type: ActivityLog['type'],
    message: string,
    options: Partial<Pick<ActivityLog, 'filename' | 'nodeId' | 'nodeLabel' | 'success'>> = {}
  ): void {
    const entry: ActivityLog = {
      id: String(this.nextId++),
      type,
      message,
      filename: options.filename,
      nodeId: options.nodeId,
      nodeLabel: options.nodeLabel,
      success: options.success ?? true,
      timestamp: new Date()
    };
    this._logs.update(logs => [entry, ...logs].slice(0, 500));
  }

  upload(filename: string, nodeLabel: string, success: boolean, msg?: string) {
    this.log('UPLOAD', msg ?? `Upload "${filename}" → ${nodeLabel}`, { filename, nodeLabel, success });
  }

  download(filename: string, nodeLabel: string, success: boolean, msg?: string) {
    this.log('DOWNLOAD', msg ?? `Download "${filename}" depuis ${nodeLabel}`, { filename, nodeLabel, success });
  }

  replicate(filename: string, from: string, to: string, success: boolean) {
    this.log('REPLICATE', `Réplication "${filename}" ${from} → ${to}`, { filename, nodeLabel: to, success });
  }

  error(message: string, filename?: string) {
    this.log('ERROR', message, { filename, success: false });
  }

  info(message: string) {
    this.log('INFO', message, { success: true });
  }

  clear() {
    this._logs.set([]);
  }
}
