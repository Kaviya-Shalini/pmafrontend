import { Routes } from '@angular/router';
import { WelcomepmaComponent } from './welcomepage/welcomepage';
import { AuthComponent } from './auth/auth';
import { AddMemoryComponent } from './add-memory/add-memory';
import { AppLayoutComponent } from './app-layout/app-layout';
import { DashboardComponent } from './dashboard/dashboard';
export const routes: Routes = [
  // Public routes
  { path: '', component: WelcomepmaComponent },
  { path: 'auth', component: AuthComponent },

  // Layout wrapper with child pages
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'upload',
        loadComponent: () => import('./add-memory/add-memory').then((m) => m.AddMemoryComponent),
      },
      {
        path: 'photocontacts',
        loadComponent: () =>
          import('./photocontact/photocontact').then((m) => m.PhotoContactsComponent),
        data: { label: 'Photo contacts', route: '/photocontacts', icon: '📞' },
      },
      // {
      //   path: 'connect-family',
      //   loadComponent: () =>
      //     import('./connect-family/connect-family.component').then(
      //       (m) => m.ConnectFamilyComponent
      //     ),
      // },
      // {
      //   path: 'location',
      //   loadComponent: () =>
      //     import('./location/location.component').then(
      //       (m) => m.LocationComponent
      //     ),
      // },
      { path: 'add-memory', component: AddMemoryComponent },
    ],
  },

  // Wildcard (fallback)
  { path: '**', redirectTo: '' },
];
