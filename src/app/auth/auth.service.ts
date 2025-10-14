import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient, private router: Router) {
    // Initialize the user state from localStorage using the specified keys
    const userId = localStorage.getItem('pma-userId');
    if (userId) {
      const user = {
        userId: userId,
        username: localStorage.getItem('pma-username'),
        quickQuestionAnswered: localStorage.getItem('pma-quickQuestionAnswered') === 'true',
      };
      this.currentUserSubject = new BehaviorSubject<any>(user);
    } else {
      this.currentUserSubject = new BehaviorSubject<any>(null);
    }
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login`, { username, password })
      .pipe(tap((response) => this.handleLoginSuccess(response, username)));
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData);
  }

  loginWithFace(faceData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login-face`, faceData).pipe(
      // NOTE: For face login, your backend should ideally return the username in the response
      // so we can store it correctly.
      tap((response) => this.handleLoginSuccess(response))
    );
  }

  registerFace(faceData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register-face`, faceData);
  }

  logout() {
    // Clear all specified user-related keys from local storage
    localStorage.removeItem('pma-userId');
    localStorage.removeItem('pma-username');
    localStorage.removeItem('pma-quickQuestionAnswered');
    // Also remove the redundant 'user' key for cleanup
    localStorage.removeItem('user');

    this.currentUserSubject.next(null);
    this.router.navigate(['/auth']);
  }

  private handleLoginSuccess(response: any, username?: string) {
    if (response && response.success && response.userId) {
      // Set items in localStorage using the specified keys
      localStorage.setItem('pma-userId', response.userId);
      // The username from face-login response should be handled here
      const finalUsername = username || response.username;
      if (finalUsername) {
        localStorage.setItem('pma-username', finalUsername);
      }
      localStorage.setItem('pma-quickQuestionAnswered', String(response.quickQuestionAnswered));

      // Update the BehaviorSubject with the new user object
      const user = {
        userId: response.userId,
        username: finalUsername,
        quickQuestionAnswered: response.quickQuestionAnswered,
      };
      this.currentUserSubject.next(user);
    }
  }
}
