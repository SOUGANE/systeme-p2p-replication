import { Injectable, signal } from '@angular/core';

export type ActivityType = 'upload' | 'download' | 'replicate' | 'node_online' | 'node_offline' | 'check';

export interface ActivityEvent {
  id:          string;
  type:        ActivityType;
  message:     string;
  detail?:     string;
  timestamp:   Date;
  nodePort?:   number;
  nodeName?:   string;
  filename?:   string;
  success:     boolean;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {

  private _events = signal<ActivityEvent[]>([]);
  readonly events = this._events.asReadonly();

  /** Ajouter un événement (max 50 en mémoire) */
  push(
    type:     ActivityType,
    message:  string,
    options?: Partial<Omit<ActivityEvent, 'id' | 'type' | 'message' | 'timestamp'>>
  ): void {
    const event: ActivityEvent = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      message,
      timestamp: new Date(),
      success:   true,
      ...options,
    };
    this._events.update(list => [event, ...list].slice(0, 50));
  }

  // ── Helpers sémantiques ───────────────────────────────────────────────────

  logUpload(filename: string, nodeName: string, nodePort: number, success = true): void {
    this.push(
      'upload',
      success
        ? `"${filename}" uploadé sur ${nodeName}`
        : `Échec upload de "${filename}" sur ${nodeName}`,
      { filename, nodeName, nodePort, success }
    );
  }

  logDownload(filename: string, nodeName: string, nodePort: number, success = true): void {
    this.push(
      'download',
      success
        ? `"${filename}" téléchargé depuis ${nodeName}`
        : `Échec téléchargement de "${filename}" depuis ${nodeName}`,
      { filename, nodeName, nodePort, success }
    );
  }

  logReplicate(filename: string, srcName: string, destName: string, destPort: number, success = true): void {
    this.push(
      'replicate',
      success
        ? `"${filename}" répliqué : ${srcName} → ${destName}`
        : `Échec réplication de "${filename}" vers ${destName}`,
      { filename, nodeName: destName, nodePort: destPort, success }
    );
  }

  logNodeOnline(nodeName: string, nodePort: number): void {
    this.push('node_online', `${nodeName} est en ligne (port ${nodePort})`,
      { nodeName, nodePort, success: true });
  }

  logNodeOffline(nodeName: string, nodePort: number): void {
    this.push('node_offline', `${nodeName} est hors ligne (port ${nodePort})`,
      { nodeName, nodePort, success: false });
  }

  logCheck(filename: string, nodeName: string, found: boolean): void {
    this.push(
      'check',
      found
        ? `"${filename}" trouvé localement sur ${nodeName}`
        : `"${filename}" absent localement sur ${nodeName}`,
      { filename, nodeName, success: found }
    );
  }

  // ── Helpers de formatage ──────────────────────────────────────────────────

  getIcon(type: ActivityType): string {
    const icons: Record<ActivityType, string> = {
      upload:       '↑',
      download:     '↓',
      replicate:    '⟳',
      node_online:  '●',
      node_offline: '○',
      check:        '?',
    };
    return icons[type];
  }

  getBadgeClass(event: ActivityEvent): string {
    if (!event.success) return 'badge--offline';
    switch (event.type) {
      case 'upload':       return 'badge--online';
      case 'download':     return 'badge--online';
      case 'replicate':    return 'badge--warning';
      case 'node_online':  return 'badge--online';
      case 'node_offline': return 'badge--offline';
      case 'check':        return 'badge--info';
      default:             return 'badge--info';
    }
  }

  getBadgeLabel(event: ActivityEvent): string {
    if (!event.success) return 'Échec';
    switch (event.type) {
      case 'upload':       return 'Upload';
      case 'download':     return 'Download';
      case 'replicate':    return 'Réplication';
      case 'node_online':  return 'En ligne';
      case 'node_offline': return 'Hors ligne';
      case 'check':        return event.success ? 'Trouvé' : 'Absent';
      default:             return 'Info';
    }
  }

  formatTime(date: Date): string {
    const now   = new Date();
    const diffS = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffS < 60)  return `Il y a ${diffS}s`;
    if (diffS < 3600) return `Il y a ${Math.floor(diffS / 60)}min`;
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
