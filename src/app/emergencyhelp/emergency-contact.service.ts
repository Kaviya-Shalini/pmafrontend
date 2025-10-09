import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmergencyContact {
  id?: number;
  name: string;
  relationship: string;
  phone: string;
  photoUrl?: string;
  photoFileId?: string; // <-- add this
}

// This will be the shape of the response from your backend's GET request
export interface EmergencyContactResponse {
  items: EmergencyContact[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class EmergencyContactService {
  private apiUrl = 'http://localhost:8080/api/emergencycontacts';

  constructor(private http: HttpClient) {}

  getAll(): Observable<EmergencyContactResponse> {
    return this.http.get<EmergencyContactResponse>(this.apiUrl);
  }

  add(formData: FormData): Observable<EmergencyContact> {
    return this.http.post<EmergencyContact>(this.apiUrl, formData);
  }

  update(id: number, formData: FormData): Observable<EmergencyContact> {
    return this.http.put<EmergencyContact>(`${this.apiUrl}/${id}`, formData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
