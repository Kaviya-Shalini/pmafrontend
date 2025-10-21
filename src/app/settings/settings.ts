import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
interface User {
  id?: string;
  username: string;
  isAlzheimer?: boolean;
  email?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
})
export class SettingsComponent implements OnInit {
  user: User | null = null;
  deleteConfirmed = false;
  toastMessage = '';
  toastVisible = false;

  constructor(private http: HttpClient, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.loadUser();
  }

  loadUser() {
    const userId = localStorage.getItem('pma-userId');
    if (userId) {
      this.http.get(`http://localhost:8080/api/user/${userId}`).subscribe((res: any) => {
        this.user = res;
      });
    }
  }

  deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.'))
      return;

    if (!this.user?.id) return;
    this.http.delete(`http://localhost:8080/api/user/${this.user.id}`).subscribe({
      next: () => {
        this.showToast('Account deleted successfully');

        // CALL LOGOUT: Clears session state from local storage and attempts navigation to /auth
        this.authService.logout();

        setTimeout(() => {
          // Redirect to login page as requested. This navigation will override
          // the one initiated by authService.logout() if they are different.
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: () => this.showToast('Failed to delete account'),
    });
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 3000);
  }
}
