import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'upload',
    loadComponent: () => import('./features/upload/upload.component').then(m => m.UploadComponent)
  },
  {
    path: 'download',
    loadComponent: () => import('./features/download/download.component').then(m => m.DownloadComponent)
  },
  {
    path: 'replication',
    loadComponent: () => import('./features/replication/replication.component').then(m => m.ReplicationComponent)
  },
  {
    path: 'nodes',
    loadComponent: () => import('./features/nodes/nodes.component').then(m => m.NodesComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];
