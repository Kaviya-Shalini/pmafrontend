import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoutineService } from './routine.service';

@Component({
  selector: 'app-routine-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './routine-tracker.html',
})
export class RoutineTrackerComponent implements OnInit {
  // Model for new routine form
  newRoutine = {
    question: '',
    time: '',
    repeatDaily: false,
    patientId: '',
  };

  routines: any[] = [];
  familyMemberId: string = '';

  constructor(private routineService: RoutineService) {}

  ngOnInit(): void {
    const userId = localStorage.getItem('pma-userId');
    if (userId) {
      this.familyMemberId = userId;
      this.loadRoutines();
    } else {
      console.error('⚠️ Missing familyMemberId in localStorage');
    }
  }

  addRoutine(): void {
    // ✅ Validate inputs
    if (!this.newRoutine.question || !this.newRoutine.time) {
      alert('⚠️ Please fill in the question and time.');
      return;
    }
    if (!this.newRoutine.patientId) {
      alert('⚠️ Please select a patient before adding a routine.');
      return;
    }

    // ✅ Build payload matching backend expectations
    const routinePayload = {
      question: this.newRoutine.question,
      timeOfDay: this.newRoutine.time,
      repeatDaily: this.newRoutine.repeatDaily,
      patientId: this.newRoutine.patientId,
      createdBy: this.familyMemberId,
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
        alert('⚠️ Failed to add routine. Check console for details.');
      },
    });
  }
  loadRoutines(): void {
    const userId = localStorage.getItem('pma-userId');
    if (!userId) return;

    this.routineService.getSharedRoutines(userId).subscribe({
      next: (data) => {
        this.routines = data || [];
        console.log('📋 Loaded shared routines:', this.routines);
      },
      error: (err) => console.error('❌ Error fetching shared routines:', err),
    });
  }

  deleteRoutine(id?: string): void {
    if (!id) {
      console.error('⚠️ Routine ID missing');
      return;
    }

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

  resetForm(): void {
    this.newRoutine = {
      question: '',
      time: '',
      repeatDaily: false,
      patientId: '',
    };
  }
}
