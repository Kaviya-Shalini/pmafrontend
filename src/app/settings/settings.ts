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
      // Fetch details from API. Note that the API returns the ID as 'userId',
      // but the frontend interface uses 'id' (which is fine, but can be confusing).
      this.http.get(`http://localhost:8080/api/user/${userId}`).subscribe((res: any) => {
        // Map 'userId' from response to 'id' property in interface for consistency
        this.user = {
          ...res,
          id: res.userId || userId, // Use userId from localStorage as fallback
        };
      });
    }
  }

  deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.'))
      return;

    // 🔥 FIX: Use the ID directly from localStorage as the ultimate source of truth
    // to prevent the check from failing due to asynchronous timing.
    const userIdToDelete = this.user?.id || localStorage.getItem('pma-userId');

    if (!userIdToDelete) {
      this.showToast('Error: User ID not found.');
      return;
    }

    // Updated URL based on your latest backend code: /api/user/delete/{userId}
    this.http.delete(`http://localhost:8080/api/user/delete/${userIdToDelete}`).subscribe({
      next: () => {
        this.showToast('Account deleted successfully');

        // Manual cleanup to ensure immediate logout is the most robust solution.
        localStorage.removeItem('pma-userId');
        localStorage.removeItem('pma-username');
        localStorage.removeItem('pma-quickQuestionAnswered');
        localStorage.removeItem('user');

        setTimeout(() => {
          this.router.navigate(['/auth']);
        }, 1500);
      },
      error: (err) => {
        console.error('Account deletion failed:', err);
        this.showToast('Failed to delete account');
      },
    });
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 3000);
  }
}
