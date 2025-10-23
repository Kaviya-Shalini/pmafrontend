// src/app/memory-reminder/memory-reminder.service.ts (New Service)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import * as Stomp from 'stompjs';
import SockJS from 'sockjs-client';

export interface MemoryReminder {
  id: string;
  title: string;
  description: string;
  hasVoiceNote: boolean;
  reminderAt: string;
  reminderDaily: boolean;
}

@Injectable({ providedIn: 'root' })
export class MemoryReminderService {
  private userId: string | null = localStorage.getItem('pma-userId');
  private baseUrl = 'http://localhost:8080/api/memories';
  private latestReminder = new BehaviorSubject<MemoryReminder | null>(null);
  public currentReminder$ = this.latestReminder.asObservable();
  private stompClient!: Stomp.Client;

  constructor(private http: HttpClient) {
    if (this.userId) {
      this.connect();
    }
  }

  // 1. WebSocket Connection & Subscription
  private connect(): void {
    const ws = new SockJS('http://localhost:8080/ws');
    this.stompClient = Stomp.over(ws);

    this.stompClient.connect({}, () => {
      console.log('Connected to WebSocket for reminders');
      // Subscribe to the user's private reminder topic
      this.stompClient.subscribe(`/topic/reminders/${this.userId}`, (message) => {
        const reminder: MemoryReminder = JSON.parse(message.body);
        this.latestReminder.next(reminder);
      });
    });
  }
  // 2. Mark as Read API Call
  markAsRead(memoryId: string): Observable<any> {
    const url = `${this.baseUrl}/${memoryId}/mark-read`;
    // Clear the currently displayed reminder upon action
    this.latestReminder.next(null);
    return this.http.patch(url, {}); // Use PATCH verb
  }

  // 3. Get Voice Note URL (using existing download endpoint)
  getVoiceNoteUrl(memoryId: string): string {
    return `http://localhost:8080/api/memories/${memoryId}/download?type=voice`;
  }
}
