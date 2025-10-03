import { Routes } from '@angular/router';
import { WelcomepmaComponent } from './welcomepage/welcomepage';
import { AuthComponent } from './auth/auth';
import { AddMemoryComponent } from './add-memory/add-memory';

export const routes: Routes = [
  { path: '', component: WelcomepmaComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'add-memory', component: AddMemoryComponent },

  { path: '**', redirectTo: '' },
];
