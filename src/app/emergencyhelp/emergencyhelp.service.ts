import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  photoUrl?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class EmergencyHelpService {
  private base = 'http://localhost:8080/api/emergencycontacts';

  constructor(private http: HttpClient) {}

  addContact(fd: FormData): Observable<EmergencyContact> {
    return this.http.post<EmergencyContact>(this.base, fd);
  }

  updateContact(id: string, fd: FormData): Observable<EmergencyContact> {
    return this.http.put<EmergencyContact>(`${this.base}/${id}`, fd);
  }

  deleteContact(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }

  getContacts(
    page = 0,
    size = 10,
    q = ''
  ): Observable<{ items: EmergencyContact[]; total: number; page: number; size: number }> {
    let params = new HttpParams().set('page', `${page}`).set('size', `${size}`);
    if (q && q.trim()) params = params.set('q', q.trim());
    return this.http.get<{ items: EmergencyContact[]; total: number; page: number; size: number }>(
      this.base,
      { params }
    );
  }
}
