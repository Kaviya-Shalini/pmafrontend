import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmergencyContact {
  id?: number; // <- optional now
  name: string;
  relationship: string;
  phone: string;
  photoUrl?: string;
  createdAt?: string; // store ISO string from backend
}

@Injectable({ providedIn: 'root' })
export class EmergencyContactService {
  private apiUrl = 'http://localhost:8080/api/emergencycontacts'; // change as needed

  constructor(private http: HttpClient) {}

  getAll(): Observable<EmergencyContact[]> {
    return this.http.get<EmergencyContact[]>(this.apiUrl);
  }

  // Accept Partial because id will be assigned by backend
  add(contact: Partial<EmergencyContact>): Observable<EmergencyContact> {
    return this.http.post<EmergencyContact>(this.apiUrl, contact);
  }

  update(id: number, contact: Partial<EmergencyContact>): Observable<EmergencyContact> {
    return this.http.put<EmergencyContact>(`${this.apiUrl}/${id}`, contact);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
