import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private alertsSubject = new BehaviorSubject<any[]>([]);
  alerts$ = this.alertsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Called from LocationComponent (patient)
  sendAlert(alertData: any) {
    return this.http.post('http://localhost:8080/api/alerts/danger', alertData).subscribe({
      next: () => console.log('Alert sent successfully'),
      error: (err) => console.error('Failed to send alert:', err),
    });
  }

  // Called from Dashboard (family)
  fetchAlertsForUser(userId: string) {
    this.http.get<any[]>(`http://localhost:8080/api/alerts/${userId}`).subscribe({
      next: (alerts) => this.alertsSubject.next(alerts),
      error: (err) => console.error('Failed to fetch alerts:', err),
    });
  }

  clearAlertsAfterDelay(delayMs = 10000) {
    setTimeout(() => this.alertsSubject.next([]), delayMs);
  }
}
