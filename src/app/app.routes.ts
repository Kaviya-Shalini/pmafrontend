import { Routes } from '@angular/router';
import { WelcomepmaComponent } from './welcomepage/welcomepage';
import { AuthComponent } from './auth/auth';
import { AddMemoryComponent } from './add-memory/add-memory';
import { AppLayoutComponent } from './app-layout/app-layout';
import { MyPeopleComponent } from './mypeople/mypeople';
import { MemoriesComponent } from './memories/memories';
import { SettingsComponent } from './settings/settings';

export const routes: Routes = [
  // Public routes
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },

  // ✅ FIX 2: Define the welcome page on a distinct path
  { path: 'welcome', component: WelcomepmaComponent },
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
        path: 'routinetracker',
        loadComponent: () =>
          import('./routine-tracker/routine-tracker').then((m) => m.RoutineManagementComponent),
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
      // **THIS IS THE FIX**
      {
        path: 'emergencyhelp',
        loadComponent: () =>
          import('./emergencyhelp/emergencyhelp').then((m) => m.EmergencyHelpComponent),
      },
      { path: 'add-memory', component: AddMemoryComponent },
      { path: 'memories', component: MemoriesComponent },
      { path: 'settings', component: SettingsComponent },
    ],
  },

  // Wildcard (fallback)
  { path: '**', redirectTo: '' },
];
