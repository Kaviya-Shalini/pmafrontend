import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import * as Stomp from 'stompjs';
import SockJS from 'sockjs-client';

export interface RoutineTask {
  id?: string;
  patientId: string;
  caregiverId: string;
  question: string;
  scheduledTime: string; // "HH:mm:ss"
  repeatDaily: boolean;
}

export interface RoutineNotification {
  responseId: string;
  question: string;
  notificationTimeMs: number;
}

@Injectable({
  providedIn: 'root',
})
export class RoutineService {
  private apiUrl = 'http://localhost:8080/api/routine';
  private stompClient: Stomp.Client | null = null;
  private notificationSubject = new Subject<RoutineNotification>();
  public routineNotification$ = this.notificationSubject.asObservable();

  constructor(private http: HttpClient) {}

  // 1. Caregiver Functions (CRUD)
  createRoutine(task: RoutineTask): Observable<RoutineTask> {
    return this.http.post<RoutineTask>(`${this.apiUrl}/tasks`, task);
  }

  getPatientRoutines(patientId: string): Observable<RoutineTask[]> {
    return this.http.get<RoutineTask[]>(`${this.apiUrl}/tasks/patient/${patientId}`);
  }

  getTaskHistory(taskId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/responses/task/${taskId}`);
  }

  // 2. Patient Function (Record Response)
  recordResponse(responseId: string, response: 'YES' | 'NO'): Observable<any> {
    const payload = {
      responseId: responseId,
      response: response,
      responseTimestamp: new Date().toISOString(), // Capture the exact click time
    };
    return this.http.post(`${this.apiUrl}/response`, payload);
  }

  // 3. WebSocket Setup (for Patient)
  public connect(patientId: string): void {
    const socket = new SockJS('http://localhost:8080/ws');
    this.stompClient = Stomp.over(socket);

    this.stompClient.connect(
      {},
      () => {
        console.log('Routine WebSocket Connected');
        // Subscribe to the patient's personal routine topic
        this.stompClient?.subscribe(`/topic/routine/${patientId}`, (message: Stomp.Message) => {
          const notification: RoutineNotification = JSON.parse(message.body);
          this.notificationSubject.next(notification); // Push the notification to the subject
        });
      },
      (error) => {
        console.error('Routine WebSocket connection error:', error);
      }
    );
  }

  public disconnect(): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.disconnect(() => {
        console.log('Routine WebSocket Disconnected');
      });
    }
  }
}
