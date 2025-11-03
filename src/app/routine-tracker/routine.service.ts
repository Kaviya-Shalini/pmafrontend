// src/app/services/routine-tracker.service.ts
import { Injectable } from '@angular/core';
import { Client, over } from 'stompjs';
import * as Stomp from 'stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface RoutineNotification {
  id?: string;
  question: string;
  time: string; // e.g. "09:00"
  repeatDaily: boolean;
  patientId: string;
  familyMemberId: string;
}

@Injectable({ providedIn: 'root' })
export class RoutineService {
  private stompClient!: Client;
  private connected = false;
  private baseUrl = 'http://localhost:8080/api';

  private routineNotificationSubject = new BehaviorSubject<any | null>(null);
  routineNotification$ = this.routineNotificationSubject.asObservable();

  constructor(private http: HttpClient) {}

  connect(userId: string): void {
    const socket = new SockJS('http://localhost:8080/ws');
    this.stompClient = over(socket);

    this.stompClient.connect({}, () => {
      this.connected = true;
      console.log('✅ Connected to Routine WebSocket');
      this.stompClient.subscribe(`/routine/${userId}`, (message) => {
        if (message.body) {
          const notification = JSON.parse(message.body);
          this.routineNotificationSubject.next(notification);
        }
      });
    });
  }

  disconnect(): void {
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect(() => console.log('❌ Disconnected Routine WebSocket'));
      this.connected = false;
    }
  }

  // CRUD operations for routines
  addRoutine(routine: any): Observable<any> {
    return this.http.post('http://localhost:8080/api/routines/create', routine);
  }

  getRoutinesForPatient(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8080/api/routines/forPatient/${patientId}`);
  }

  getRoutinesByFamilyMember(familyMemberId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8080/api/routines/family/${familyMemberId}`);
  }
  getSharedRoutines(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8080/api/routines/shared/${userId}`);
  }

  deleteRoutine(routineId: string, requestedBy: string): Observable<any> {
    return this.http.delete(
      `http://localhost:8080/api/routines/${routineId}?requestedBy=${requestedBy}`
    );
  }

  recordResponse(routineId: string, response: string): Observable<any> {
    return this.http.post(`http://localhost:8080/api/routines/respond/${routineId}`, { response });
  }
  addResponse(routineId: string, patientId: string, createdBy: string, answer: string) {
    const payload = {
      routineId: routineId,
      patientId: patientId,
      createdBy: createdBy,
      answer: answer,
    };

    console.log('📤 Sending routine response payload:', payload);

    return this.http.post('http://localhost:8080/api/routineResponses/respond', payload);
  }

  getLatestResponse(routineId: string) {
    return this.http.get(`${this.baseUrl}/routineResponses/${routineId}/latest`);
  }
}
