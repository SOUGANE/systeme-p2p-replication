import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard — P2P Node'
  },
  {
    path: 'nodes',
    loadComponent: () =>
      import('./features/nodes/nodes.component').then(m => m.NodesComponent),
    title: 'Nœuds — P2P Node'
  },
  {
    path: 'files',
    loadComponent: () =>
      import('./features/files/files.component').then(m => m.FilesComponent),
    title: 'Fichiers — P2P Node'
  },
  {
    path: 'network',
    loadComponent: () =>
      import('./features/network/network.component').then(m => m.NetworkComponent),
    title: 'Réseau — P2P Node'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
