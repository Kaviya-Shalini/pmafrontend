import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

// Simplified interface for a connected user returned by the backend
export interface ConnectedUser {
  id: string;
  username: string;
}

@Injectable({
  providedIn: 'root',
})
export class FamilyService {
  private apiUrl = 'http://localhost:8080/api/family';

  constructor(private http: HttpClient) {}

  /**
   * Fetches the list of patients connected to the logged-in family member.
   * @param familyMemberId The ID of the logged-in caregiver (Kaviya's ID).
   * @returns Observable of the first patient's ID (Shalini's ID).
   */
  getPatientIdForCaregiver(familyMemberId: string): Observable<string | null> {
    // Calls GET /api/family/list/{userId}
    return this.http
      .get<{ success: boolean; message: string; data: ConnectedUser[] }>(
        `${this.apiUrl}/list/${familyMemberId}`
      )
      .pipe(
        map((response) => {
          if (response.data && response.data.length > 0) {
            // Assuming Kaviya monitors only the first patient found (Shalini)
            return response.data[0].id;
          }
          console.warn(
            `[FamilyService] No connected patient found for caregiver ID: ${familyMemberId}`
          );
          return null;
        })
      );
  }
}
