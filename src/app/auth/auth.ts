import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
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
export class AuthComponent implements AfterViewInit, OnDestroy {
  isLogin = true;
  loading = false;
  successMessage = '';
  errorMessage = '';
  useFaceLogin = false;
  showFaceRegistrationPrompt = false;
  registeredUserId = '';

  @ViewChild('videoElement') videoElement: ElementRef | undefined;

  constructor(private http: HttpClient, private router: Router) {}

  ngAfterViewInit() {
    if (this.isLogin && this.useFaceLogin) {
      this.startCamera();
    }
  }

  // **ADD OnDestroy LIFECYCLE HOOK**
  ngOnDestroy() {
    this.stopCamera();
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.successMessage = '';
    this.errorMessage = '';
    this.useFaceLogin = false;
    this.stopCamera();
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
    // Clear all user-related local storage
    localStorage.removeItem('pma-userId');
    localStorage.removeItem('pma-username');
    localStorage.removeItem('pma-quickQuestionAnswered');
    localStorage.removeItem('user');

    // Stop camera if active
    this.stopCamera();

    // Reset component state
    this.isLogin = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.useFaceLogin = false;

    // Redirect to login page
    this.router.navigate(['/login']);
  }

  captureAndLogin() {
    this.capture().then((blob) => {
      const formData = new FormData();
      formData.append('face', blob, 'face.jpg');

      this.loading = true;
      this.http
        .post<{
          success: boolean;
          message: string;
          userId?: string;
          quickQuestionAnswered?: boolean;
        }>('http://localhost:8080/api/login-face', formData)
        .subscribe({
          next: (res) => {
            this.loading = false;
            if (res.success && res.userId) {
              localStorage.setItem('pma-userId', res.userId);
              localStorage.setItem('pma-quickQuestionAnswered', String(res.quickQuestionAnswered));
              this.successMessage = 'Login successful!';
              // **STOP CAMERA ON SUCCESS**
              this.stopCamera();
              setTimeout(() => this.router.navigate(['/dashboard']), 1000);
            } else {
              this.errorMessage = res.message || 'Face not recognized.';
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
      // ✅ Create form data
      const formData = new FormData();

      // ✅ Add userId and face image to the form data
      formData.append('userId', this.registeredUserId);
      formData.append('face', blob, 'face.jpg');

      // ✅ Send form data to backend
      this.http.post('http://localhost:8080/api/register-face', formData).subscribe({
        next: () => {
          this.successMessage = 'Face registered successfully!';
          this.showFaceRegistrationPrompt = false;
          this.stopCamera();
          setTimeout(() => this.toggleMode(), 1500); // Switch to login mode
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
    this.toggleMode(); // Switch to login
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

  submit(formValue: any) {
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.isLogin) {
      // Expect userId in the response
      this.http
        .post<{
          success: boolean;
          message: string;
          userId?: string;
          quickQuestionAnswered?: boolean;
        }>('http://localhost:8080/api/login', formValue)
        .subscribe({
          next: (res) => {
            this.loading = false;
            if (res.success && res.userId) {
              localStorage.setItem('pma-userId', res.userId);
              localStorage.setItem('pma-username', formValue.username); // <-- ADD THIS LINE
              localStorage.setItem('pma-quickQuestionAnswered', String(res.quickQuestionAnswered));
              this.successMessage = 'Login successful!';
              localStorage.setItem('user', JSON.stringify(res.userId));
              // **STOP CAMERA ON SUCCESS**
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
      // Expect userId in the response
      this.http
        .post<{
          success: boolean;
          message: string;
          userId?: string;
          quickQuestionAnswered?: boolean;
        }>('http://localhost:8080/api/register', formValue)
        .subscribe({
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
