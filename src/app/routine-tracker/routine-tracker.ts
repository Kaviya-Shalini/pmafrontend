import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoutineService } from './routine.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-routine-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './routine-tracker.html',
})
export class RoutineTrackerComponent implements OnInit {
  newRoutine = {
    question: '',
    time: '',
    repeatDaily: false,
    patientId: '',
  };

  routines: any[] = [];
  familyMemberId: string = '';
  patientId: string = '';
  responses: { [routineId: string]: string } = {};

  user: any = null;
  isAlzheimerPatient = false;
  isPatient = false;

  constructor(private routineService: RoutineService, private http: HttpClient) {}

  ngOnInit(): void {
    const userId = localStorage.getItem('pma-userId');
    const role = localStorage.getItem('pma-role');

    if (!userId) {
      console.error('⚠️ Missing user ID in localStorage');
      return;
    }

    this.familyMemberId = userId;
    this.isPatient = role === 'patient';

    // Load full user object to detect Alzheimer flag (same as Dashboard)
    this.http.get<any>(`http://localhost:8080/api/user/${userId}`).subscribe({
      next: (res) => {
        this.user = res;
        this.isAlzheimerPatient =
          res.isAlzheimer === true ||
          res.condition?.toLowerCase() === 'alzheimer' ||
          res.diagnosis?.toLowerCase() === 'alzheimer';

        // If the logged-in account is a patient or Alzheimer patient, use their id as patientId
        if (this.isAlzheimerPatient || this.isPatient) {
          this.patientId = userId;
          this.loadRoutines();
        } else {
          // Family member: fetch their connected patients using the correct backend endpoint
          // Backend endpoint: GET /api/family/list/{userId}
          this.http.get<any[]>(`http://localhost:8080/api/family/list/${userId}`).subscribe({
            next: (connections) => {
              if (!Array.isArray(connections) || connections.length === 0) {
                console.warn('⚠️ No connected patient found for this family member.');
                // optionally show a UI note to add connections
                return;
              }

              // The backend returns [{ id, username }, ...] — pick the first patient (or show selection UI)
              const firstPatient = connections[0];
              this.patientId = firstPatient.id;
              console.log('👪 Found connected patient:', firstPatient);
              this.loadRoutines();
            },
            error: (err) => {
              console.error('❌ Error fetching connected patients for family member:', err);
            },
          });
        }
      },
      error: (err) => {
        console.error('Failed to load user details', err);
      },
    });

    // still connect websocket for current logged-in user (optional)
    this.routineService.connect(userId);
  }

  loadRoutines() {
    if (!this.patientId) {
      console.warn('⚠️ Missing patientId while loading routines.');
      return;
    }

    this.http
      .get<any[]>(`http://localhost:8080/api/routines/forPatient/${this.patientId}`)
      .subscribe({
        next: (routines) => {
          this.routines = routines;

          // Each routine now already contains latestResponse from backend
          console.log('📋 Loaded routines with latest responses:', this.routines);
        },
        error: (err) => {
          console.error('❌ Error loading routines:', err);
        },
      }); // ✅ Make sure this parenthesis closes subscribe()
  }

  // ✅ Add a new routine
  addRoutine(): void {
    if (!this.newRoutine.question || !this.newRoutine.time) {
      alert('⚠️ Please fill in the question and time.');
      return;
    }

    if (!this.newRoutine.patientId) {
      alert('⚠️ Please select a patient before adding a routine.');
      return;
    }

    const routinePayload = {
      question: this.newRoutine.question,
      timeOfDay: this.newRoutine.time,
      repeatDaily: this.newRoutine.repeatDaily,
      patientId: this.newRoutine.patientId,
      createdBy: this.familyMemberId, // ✅ now properly filled
    };

    console.log('📤 Sending routine payload:', routinePayload);

    this.routineService.addRoutine(routinePayload).subscribe({
      next: (res) => {
        console.log('✅ Routine added:', res);
        alert('✅ Routine added successfully!');
        this.resetForm();
        this.loadRoutines();
      },
      error: (err) => {
        console.error('❌ Error adding routine:', err);
        alert('⚠️ Failed to add routine.');
      },
    });
  }

  deleteRoutine(id?: string): void {
    if (!id) return;
    if (confirm('🗑 Are you sure you want to delete this routine?')) {
      this.routineService.deleteRoutine(id, this.familyMemberId).subscribe({
        next: () => {
          alert('✅ Routine deleted successfully!');
          this.loadRoutines();
        },
        error: (err) => console.error('❌ Error deleting routine:', err),
      });
    }
  }

  sendResponse(routineId: string, answer: string) {
    const patientId = this.patientId || localStorage.getItem('pma-userId');
    const createdBy = this.familyMemberId || localStorage.getItem('pma-userId');

    const payload = { routineId, patientId, createdBy, answer };

    this.http.post('http://localhost:8080/api/routineResponses/respond', payload).subscribe({
      next: (res: any) => {
        console.log('✅ Response recorded:', res);

        // Fetch updated latest response
        this.http
          .get(`http://localhost:8080/api/routineResponses/${routineId}/latest`)
          .subscribe((latest: any) => {
            const routine = this.routines.find((r) => r.id === routineId || r._id === routineId);
            if (routine) {
              // 🧠 Fix: handle wrapped structure
              routine.latestResponse = latest.data ? latest.data : latest;
            }
            console.log('🟢 Updated latest response:', routine?.latestResponse);
          });
      },
      error: (err) => {
        console.error('❌ Error recording response:', err);
      },
    });
  }

  resetForm(): void {
    this.newRoutine = {
      question: '',
      time: '',
      repeatDaily: false,
      patientId: '',
    };
  }
}
