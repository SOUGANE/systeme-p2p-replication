import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ToastContainerComponent],
  template: `
    <div class="app-shell">
      <app-sidebar />
      <main class="app-main">
        <router-outlet />
      </main>
      <app-toast-container />
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      min-height: 100vh;
    }
    .app-main {
      flex: 1;
      margin-left: var(--sidebar-width);
      min-height: 100vh;
      background: var(--bg-primary);
      overflow-x: hidden;
    }
    @media (max-width: 768px) {
      .app-main { margin-left: 0; }
    }
  `]
})
export class AppComponent {}
