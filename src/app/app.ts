// src/app/app.ts

import { Component, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
// ✅ CRITICAL: Add RouterModule here
import { RouterOutlet, RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  // ✅ FIX: Include RouterModule for routing directives (like routerLink) to work throughout the app
  imports: [RouterOutlet, ReactiveFormsModule, RouterModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  protected readonly title = signal('pmafrontend');
}
