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
    { label: 'Memories', route: '/memories', icon: '💓' },
    { label: 'Connect Family', route: '/connect-family', icon: '👨‍👩‍👧‍👦' },
    { label: 'Location', route: '/location', icon: '📍' },
    { label: 'Photo contacts', route: '/photocontacts', icon: '📞' },
    { label: 'My People', route: '/mypeople', icon: '🫂' },
    // { label: 'How I Feel', route: '/howifeel', icon: '😳😊' },
    { label: 'Emergency Help', route: '/emergencyhelp', icon: '‼️' },
    // { label: 'Routine Tracker', route: '/routinetracker', icon: '📋' },
    { label: 'Settings', route: '/settings', icon: '⚙️' },
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
