import { Routes } from '@angular/router';
import { WelcomepmaComponent } from './welcomepage/welcomepage';
import { AuthComponent } from './auth/auth';
import { AddMemoryComponent } from './add-memory/add-memory';
import { AppLayoutComponent } from './app-layout/app-layout';
import { DashboardComponent } from './dashboard/dashboard';
import { MyPeopleComponent } from './mypeople/mypeople';
import { MemoriesComponent } from './memories/memories';
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
      },
      { path: 'mypeople', component: MyPeopleComponent },

      {
        path: 'connect-family',
        loadComponent: () =>
          import('./connectfamily/connectfamily').then((m) => m.ConnectFamilyComponent),
      },
      {
        path: 'location',
        loadComponent: () => import('./location/location').then((m) => m.LocationComponent),
      },
      { path: 'add-memory', component: AddMemoryComponent },
      { path: 'memories', component: MemoriesComponent },
    ],
  },

  // Wildcard (fallback)
  { path: '**', redirectTo: '' },
];
