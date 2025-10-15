import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlertService {
  constructor(private http: HttpClient) {}

  /**
   * Called from the LocationComponent (patient) to send a new danger alert.
   * This returns an Observable that the component can subscribe to for completion.
   */
  sendAlert(alertData: any): Observable<any> {
    return this.http.post('http://localhost:8080/api/alerts/danger', alertData);
  }

  /**
   * Called from the DashboardComponent (family member) to fetch new alerts.
   * This is now a stateless method that returns the HTTP request as an Observable,
   * allowing the component to manage the state itself.
   */
  fetchAlertsForUser(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8080/api/alerts/${userId}`);
  }
}
