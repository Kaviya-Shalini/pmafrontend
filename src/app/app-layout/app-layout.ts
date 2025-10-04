import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app-layout.html',
})
export class AppLayoutComponent {
  collapsed = false;

  navItems = [
    { label: 'Dashboard', route: '/dashboard', icon: '📊' },
    { label: 'Add Memory', route: '/add-memory', icon: '🧠' },
    { label: 'Search', route: '/search', icon: '🔍' },
    { label: 'Connect Family', route: '/connect-family', icon: '👨‍👩‍👧‍👦' },
    { label: 'Location', route: '/location', icon: '📍' },
    { label: 'Upload', route: '/upload', icon: '📤' },
  ];

  constructor(private router: Router) {}

  toggleSidebar() {
    this.collapsed = !this.collapsed;
  }

  logout() {
    // Clear all user-specific data from localStorage
    localStorage.removeItem('pma-userId');
    localStorage.removeItem('pma-quickQuestionAnswered');

    // Redirect to the authentication page
    this.router.navigate(['/auth']);
  }
}
