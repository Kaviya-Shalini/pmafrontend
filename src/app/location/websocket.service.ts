import { Injectable } from '@angular/core';
import * as Stomp from 'stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private stompClient: any;
  public alertMessage: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor() {}

  public connect() {
    // Prevent multiple connection attempts
    if (this.stompClient?.connected) {
      return;
    }

    const socket = new SockJS('http://localhost:8080/ws');
    this.stompClient = Stomp.over(socket);

    // Disable debug messages in production
    this.stompClient.debug = () => {};

    const connectCallback = (frame: any) => {
      console.log('WebSocket Connected: ' + frame);
      this.stompClient.subscribe('/topic/alerts', (message: any) => {
        this.alertMessage.next(JSON.parse(message.body));
      });
    };

    // THIS IS THE CRITICAL ADDITION
    const errorCallback = (error: any) => {
      console.error('WebSocket connection error:', error);
      // Optional: attempt to reconnect after a delay
      setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        this.connect();
      }, 5000); // Retry every 5 seconds
    };

    this.stompClient.connect({}, connectCallback, errorCallback);
  }

  public disconnect() {
    if (this.stompClient !== null && this.stompClient.connected) {
      this.stompClient.disconnect(() => {
        console.log('WebSocket Disconnected');
      });
    }
  }
}
