import { Component, OnInit } from '@angular/core';
import { RoutineService, RoutineTask } from './routine.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-routine-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './routine-tracker.html',
  styleUrls: ['./routine-tracker.css'],
})
export class RoutineManagementComponent implements OnInit {
  // Mock/Hardcoded patient ID for demonstration - replace with actual selection logic
  patientId: string = 'PATIENT_ID_EXAMPLE';
  caregiverId: string | null = null;

  newQuestion: string = '';
  newScheduledTime: string = '09:00'; // Default to 9 AM
  repeatDaily: boolean = true;

  tasks: RoutineTask[] = [];
  selectedTaskHistory: any[] = [];
  selectedTaskQuestion: string = '';

  constructor(private routineService: RoutineService, private authService: AuthService) {}

  ngOnInit(): void {
    this.caregiverId = this.authService.currentUserValue?.userId;
    if (this.caregiverId) {
      this.loadRoutines();
    }
    // NOTE: In a complete application, you must first link the caregiver to a patient
    // and dynamically fetch the `patientId`. For now, use the example ID.
  }

  loadRoutines(): void {
    if (this.patientId) {
      this.routineService.getPatientRoutines(this.patientId).subscribe({
        next: (tasks) => (this.tasks = tasks),
        error: (err) => console.error('Failed to load routines', err),
      });
    }
  }

  addRoutine(): void {
    if (!this.newQuestion || !this.newScheduledTime || !this.caregiverId) {
      alert('Please fill in all fields and ensure you are logged in.');
      return;
    }

    // Convert HH:mm to HH:mm:ss for the backend model
    const scheduledTime = this.newScheduledTime + ':00';

    const newTask: RoutineTask = {
      patientId: this.patientId,
      caregiverId: this.caregiverId,
      question: this.newQuestion,
      scheduledTime: scheduledTime,
      repeatDaily: this.repeatDaily,
    };

    this.routineService.createRoutine(newTask).subscribe({
      next: () => {
        this.newQuestion = '';
        this.loadRoutines(); // Reload list
        alert('Routine added successfully!');
      },
      error: (err) => console.error('Failed to add routine', err),
    });
  }

  // ACRS: View response history and cognitive metric
  viewHistory(task: RoutineTask): void {
    this.selectedTaskQuestion = task.question;
    this.routineService.getTaskHistory(task.id!).subscribe({
      next: (history) => {
        this.selectedTaskHistory = history.map((res) => ({
          ...res,
          timeToRespond: this.formatResponseTime(res.timeToRespondMs),
        }));
      },
      error: (err) => console.error('Failed to load history', err),
    });
  }

  formatResponseTime(ms: number): string {
    if (ms < 0) return 'Error (Negative Time)';
    if (ms > 3600000) return 'Over 1 hour';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}
