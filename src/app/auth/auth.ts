import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css'],
})
export class AuthComponent {
  isLogin = true;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.successMessage = '';
    this.errorMessage = '';
  }

  submit(formValue: any) {
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.isLogin) {
      // Expect userId in the response
      this.http
        .post<{ success: boolean; message: string; userId?: string }>(
          'http://localhost:8080/api/login',
          formValue
        )
        .subscribe({
          next: (res) => {
            this.loading = false;
            if (res.success && res.userId) {
              localStorage.setItem('pma-userId', res.userId); // Save the userId
              this.successMessage = 'Login successful!';
              setTimeout(() => this.router.navigate(['/add-memory']), 1000);
            } else {
              this.errorMessage = res.message || 'Invalid credentials.';
            }
          },
          error: (err) => {
            this.loading = false;
            this.errorMessage = err.error?.message || 'Server error. Try again later.';
          },
        });
    } else {
      // Expect userId in the response
      this.http
        .post<{ success: boolean; message: string; userId?: string }>(
          'http://localhost:8080/api/register',
          formValue
        )
        .subscribe({
          next: (res) => {
            this.loading = false;
            if (res.success && res.userId) {
              localStorage.setItem('pma-userId', res.userId); // Save the userId
              this.successMessage = res.message || 'Account created successfully!';
              setTimeout(() => this.toggleMode(), 1500);
            } else {
              this.errorMessage = res.message || 'Failed to create account.';
            }
          },
          error: (err) => {
            this.loading = false;
            this.errorMessage = err.error?.message || 'Server error. Try again later.';
          },
        });
    }
  }
}
