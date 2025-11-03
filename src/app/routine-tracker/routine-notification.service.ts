import { Injectable } from '@angular/core';
import { Client, over } from 'stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoutineNotificationService {
  private stompClient: Client | null = null;
  private notificationSubject = new BehaviorSubject<string | null>(null);
  notification$ = this.notificationSubject.asObservable();

  connect(userId: string): void {
    const socket = new SockJS('http://localhost:8080/ws');
    this.stompClient = over(socket);
    this.stompClient.debug = () => {}; // Add this to reduce console spam

    this.stompClient.connect(
      {},
      // SUCCESS CALLBACK
      () => {
        console.log('Routine Notification WebSocket connected.');

        // ✅ CRITICAL: Subscription must be inside the connect success callback
        this.stompClient?.subscribe(
          `/topic/notifications/${userId}`,
          (message) => {
            if (message.body) {
              console.log('📩 Routine notification received:', message.body);
              this.notificationSubject.next(message.body);
            }
          },
          // Optional: Subscription confirmation header/callback
          () => console.log(`Subscribed to routine topic for user: ${userId}`)
        );
      },
      // ❌ CRITICAL: Add ERROR CALLBACK for diagnostics
      (error) => {
        console.error('Routine Notification WebSocket Error/Handshake Failed:', error);
      }
    );
  }
  disconnect(): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.disconnect(() => {
        console.log('Routine Notification WebSocket disconnected.');
      });
    }
  }
}
