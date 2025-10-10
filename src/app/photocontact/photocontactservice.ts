import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PhotoContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  photoUrl?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PhotoContactsService {
  private base = 'http://localhost:8080/api/photocontacts';

  constructor(private http: HttpClient) {}

  // Add contact (FormData expected)
  addContact(formData: FormData): Observable<PhotoContact> {
    return this.http.post<PhotoContact>(this.base, formData);
  }
  // photoContactService.ts
  updateContact(id: string, formData: FormData): Observable<PhotoContact> {
    return this.http.put<PhotoContact>(`${this.base}/${id}`, formData);
  }
  deleteContact(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }
  getUserContacts(userId: string, page: number, size: number, search: string = '') {
    return this.http.get<{ items: PhotoContact[]; total: number; page: number; size: number }>(
      `${this.base}/by-user/${userId}?page=${page}&size=${size}&q=${search}`
    );
  }
}
