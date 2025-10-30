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

    this.stompClient.connect({}, () => {
      console.log('Routine Notification WebSocket connected.');

      this.stompClient?.subscribe(`/topic/notifications/${userId}`, (message) => {
        if (message.body) {
          console.log('📩 Routine notification received:', message.body);
          this.notificationSubject.next(message.body);
        }
      });
    });
  }
}
