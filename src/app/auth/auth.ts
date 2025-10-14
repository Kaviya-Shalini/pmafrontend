import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from './auth.service'; // Correctly import the service

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css'],
})
export class AuthComponent implements AfterViewInit, OnDestroy {
  isLogin = true;
  loading = false;
  successMessage = '';
  errorMessage = '';
  useFaceLogin = false;
  showFaceRegistrationPrompt = false;
  registeredUserId = '';

  // A model to bind to the form inputs for both login and registration
  formModel: any = { username: '', password: '', isAlzheimer: false };

  @ViewChild('videoElement') videoElement: ElementRef | undefined;

  constructor(private authService: AuthService, private router: Router) {}

  ngAfterViewInit() {
    if (this.isLogin && this.useFaceLogin) {
      this.startCamera();
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.successMessage = '';
    this.errorMessage = '';
    this.useFaceLogin = false;
    this.stopCamera();
    this.formModel = { username: '', password: '', isAlzheimer: false }; // Reset form
  }

  toggleFaceLogin() {
    this.useFaceLogin = !this.useFaceLogin;
    if (this.useFaceLogin) {
      this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  startCamera() {
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (this.videoElement) {
            this.videoElement.nativeElement.srcObject = stream;
          }
        })
        .catch((err) => {
          this.errorMessage = 'Could not access camera. Please allow camera access.';
        });
    }
  }

  stopCamera() {
    if (this.videoElement && this.videoElement.nativeElement.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  logout() {
    this.authService.logout();
    this.stopCamera();
    this.formModel = { username: '', password: '' }; // Reset the form model on logout
  }

  captureAndLogin() {
    // Check for username before proceeding
    if (!this.formModel.username) {
      this.errorMessage = 'Please enter your username before using face login.';
      return;
    }
    this.errorMessage = ''; // Clear previous error

    this.capture().then((blob) => {
      const formData = new FormData();
      formData.append('face', blob, 'face.jpg');
      // Send the username along with the face data
      formData.append('username', this.formModel.username);

      this.loading = true;
      this.authService.loginWithFace(formData).subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success) {
            this.successMessage = 'Login successful!';
            this.stopCamera();
            setTimeout(() => this.router.navigate(['/dashboard']), 1000);
          } else {
            this.errorMessage = res.message || 'Face not recognized or does not match username.';
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Server error during face login.';
        },
      });
    });
  }

  captureAndRegisterFace() {
    this.capture().then((blob) => {
      const formData = new FormData();
      formData.append('userId', this.registeredUserId);
      formData.append('face', blob, 'face.jpg');

      this.authService.registerFace(formData).subscribe({
        next: () => {
          this.successMessage = 'Face registered successfully!';
          this.showFaceRegistrationPrompt = false;
          this.stopCamera();
          setTimeout(() => this.toggleMode(), 1500);
        },
        error: () => {
          this.errorMessage = 'Failed to register face.';
        },
      });
    });
  }

  skipFaceRegistration() {
    this.showFaceRegistrationPrompt = false;
    this.stopCamera();
    this.toggleMode();
  }

  private capture(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (this.videoElement) {
        const canvas = document.createElement('canvas');
        canvas.width = this.videoElement.nativeElement.videoWidth;
        canvas.height = this.videoElement.nativeElement.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(this.videoElement.nativeElement, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject('Could not create blob from canvas.');
            }
          }, 'image/jpeg');
        } else {
          reject('Could not get 2D context from canvas.');
        }
      } else {
        reject('Video element not found.');
      }
    });
  }

  submit() {
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.isLogin) {
      // Use the formModel for login
      this.authService.login(this.formModel.username, this.formModel.password).subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success) {
            this.successMessage = 'Login successful!';
            this.stopCamera();
            setTimeout(() => this.router.navigate(['/dashboard']), 1000);
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
      // Use the formModel for registration
      this.authService.register(this.formModel).subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success && res.userId) {
            this.successMessage = res.message || 'Account created successfully!';
            this.registeredUserId = res.userId;
            this.showFaceRegistrationPrompt = true;
            setTimeout(() => this.startCamera(), 0);
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
