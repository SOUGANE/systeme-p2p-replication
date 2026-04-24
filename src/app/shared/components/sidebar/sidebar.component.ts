import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NodeService } from '../../../core/services/node.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="14" r="5" fill="#F2A93B"/>
            <circle cx="30" cy="14" r="5" fill="#5C9E8F"/>
            <circle cx="20" cy="30" r="5" fill="#F2C4B8"/>
            <line x1="10" y1="14" x2="30" y2="14" stroke="#F2A93B" stroke-width="1.5" stroke-dasharray="3 2"/>
            <line x1="10" y1="14" x2="20" y2="30" stroke="#5C9E8F" stroke-width="1.5" stroke-dasharray="3 2"/>
            <line x1="30" y1="14" x2="20" y2="30" stroke="#F2C4B8" stroke-width="1.5" stroke-dasharray="3 2"/>
          </svg>
        </div>
        <div class="logo-text">
          <span class="logo-title">P2P<span>Node</span></span>
          <span class="logo-sub">Dashboard</span>
        </div>
      </div>

      <!-- Active node indicator -->
      <div class="active-node-chip">
        <span class="dot"></span>
        <span class="chip-label">Nœud actif :</span>
        <span class="chip-value mono">{{ nodeService.activeNode().name }} :{{ nodeService.activeNode().port }}</span>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <div class="nav-section-label">Navigation</div>

        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zM11 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM11 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
          </svg>
          <span>Tableau de bord</span>
        </a>

        <a routerLink="/nodes" routerLinkActive="active" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z"/>
          </svg>
          <span>Nœuds</span>
          <span class="nav-badge">{{ nodeService.stats().totalNodes }}</span>
        </a>

        <a routerLink="/files" routerLinkActive="active" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
          </svg>
          <span>Fichiers</span>
        </a>

        <a routerLink="/network" routerLinkActive="active" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/>
          </svg>
          <span>Réseau P2P</span>
        </a>
      </nav>

      <!-- Stats footer -->
      <div class="sidebar-footer">
        <div class="footer-stat">
          <span class="fs-label">En ligne</span>
          <span class="fs-value teal">{{ nodeService.stats().onlineNodes }}/{{ nodeService.stats().totalNodes }}</span>
        </div>
        <div class="footer-stat">
          <span class="fs-label">Hors ligne</span>
          <span class="fs-value coral">{{ nodeService.stats().offlineNodes }}</span>
        </div>
        <div class="footer-stat">
          <span class="fs-label">Fichiers</span>
          <span class="fs-value amber">{{ nodeService.stats().totalFiles }}</span>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width);
      min-height: 100vh;
      background: var(--bg-sidebar);
      display: flex;
      flex-direction: column;
      padding: 0;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 100;
      border-right: 1px solid rgba(242, 169, 59, 0.15);
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px 20px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .logo-icon svg {
      width: 40px;
      height: 40px;
    }
    .logo-text {
      display: flex;
      flex-direction: column;
    }
    .logo-title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 800;
      color: var(--cream);
      letter-spacing: -0.02em;
      line-height: 1;
      span { color: var(--amber); }
    }
    .logo-sub {
      font-family: var(--font-mono);
      font-size: 10px;
      color: rgba(250, 240, 230, 0.35);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-top: 3px;
    }

    .active-node-chip {
      margin: 16px;
      padding: 10px 14px;
      background: rgba(242, 169, 59, 0.1);
      border: 1px solid rgba(242, 169, 59, 0.2);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--teal);
      flex-shrink: 0;
      animation: pulse-teal 2s ease-in-out infinite;
    }
    .chip-label { color: rgba(250, 240, 230, 0.5); white-space: nowrap; font-size: 11px; }
    .chip-value { color: var(--amber); font-family: var(--font-mono); font-size: 12px; font-weight: 500; }

    .sidebar-nav {
      flex: 1;
      padding: 8px 12px;
      overflow-y: auto;
    }
    .nav-section-label {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(250, 240, 230, 0.25);
      padding: 12px 8px 6px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 12px;
      border-radius: var(--radius-sm);
      color: rgba(250, 240, 230, 0.55);
      text-decoration: none;
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 500;
      transition: var(--transition);
      margin-bottom: 2px;
      position: relative;

      &:hover {
        background: rgba(255,255,255,0.06);
        color: var(--cream);
      }
      &.active {
        background: rgba(242, 169, 59, 0.14);
        color: var(--amber);
        .nav-icon { color: var(--amber); }
      }
    }
    .nav-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: inherit;
    }
    .nav-badge {
      margin-left: auto;
      background: rgba(242, 169, 59, 0.2);
      color: var(--amber);
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 1px 7px;
      border-radius: 100px;
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex;
      gap: 0;
    }
    .footer-stat {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .fs-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(250, 240, 230, 0.3);
      font-family: var(--font-mono);
    }
    .fs-value {
      font-family: var(--font-mono);
      font-size: 16px;
      font-weight: 500;
      &.teal { color: var(--teal); }
      &.coral { color: var(--coral); }
      &.amber { color: var(--amber); }
    }

    @media (max-width: 768px) {
      .sidebar { display: none; }
    }
  `]
})
export class SidebarComponent {
  nodeService = inject(NodeService);
}
