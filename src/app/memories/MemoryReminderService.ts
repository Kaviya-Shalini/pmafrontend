// src/app/memory-reminder/memory-reminder.service.ts (New Service)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
// ADDED map, catchError, of for polling logic
import { BehaviorSubject, Observable, catchError, of, map } from 'rxjs';
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
  // Removed automatic fetching of userId here.
  private baseUrl = 'http://localhost:8080/api/memories';
  private latestReminder = new BehaviorSubject<MemoryReminder | null>(null);
  public currentReminder$ = this.latestReminder.asObservable();
  private stompClient!: Stomp.Client;
  private isConnected = false;

  // Constructor no longer calls connect() automatically
  constructor(private http: HttpClient) {}

  // 1. New Initialization Method (called externally once user ID is confirmed)
  public initialize(userId: string): void {
    if (!this.isConnected) {
      this.connect(userId);
      this.isConnected = true;
    }
  }

  // 2. WebSocket Connection & Subscription (now accepts userId)
  private connect(userId: string): void {
    const ws = new SockJS('http://localhost:8080/ws');
    this.stompClient = Stomp.over(ws);

    // FIX: Added error callback to diagnose STOMP handshake failures
    this.stompClient.connect(
      {}, // Headers
      () => {
        console.log('Connected to WebSocket for reminders');
        // ✅ This is the correct subscription point for real-time reminders
        this.stompClient.subscribe(`/topic/reminders/${userId}`, (message) => {
          const reminder: MemoryReminder = JSON.parse(message.body);
          this.latestReminder.next(reminder);
          console.log('✅ Received live reminder:', reminder.title);
        });
      },
      (error: Stomp.Frame | string) => {
        console.error('WebSocket connection or STOMP handshake failed:', error);
        this.isConnected = false;
      }
    );
  }

  // ✅ NEW METHOD: Fetch any due and unread reminders on initial page load
  public getDueRemindersOnLoad(userId: string): Observable<MemoryReminder | null> {
    // Calls the new backend API endpoint
    const url = `${this.baseUrl}/reminders/due/${userId}`;
    return this.http.get<MemoryReminder[]>(url).pipe(
      map((reminders) => {
        if (reminders && reminders.length > 0) {
          // If reminders are found on load, push the first one to the stream
          const reminder = reminders[0];
          this.latestReminder.next(reminder);
          return reminder;
        }
        return null;
      }),
      catchError((error) => {
        console.error('Error fetching due reminders on load:', error);
        return of(null);
      })
    );
  }

  // 3. Mark as Read API Call
  markAsRead(memoryId: string): Observable<any> {
    const url = `${this.baseUrl}/${memoryId}/mark-read`;
    // Clear the currently displayed reminder upon action
    this.latestReminder.next(null);
    return this.http.patch(url, {}); // Use PATCH verb
  }

  // 4. Get Voice Note URL (using existing download endpoint)
  getVoiceNoteUrl(memoryId: string): string {
    return `http://localhost:8080/api/memories/${memoryId}/download?type=voice`;
  }
}
