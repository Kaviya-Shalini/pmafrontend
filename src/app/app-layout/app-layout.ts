import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Assuming you have created this file and interface/service as instructed previously
import { MemoryReminder, MemoryReminderService } from '../memories/MemoryReminderService';

@Component({
  selector: 'app-layout',
  standalone: true,
  // Ensure you include CommonModule and RouterModule for the template
  imports: [CommonModule, RouterModule],
  templateUrl: './app-layout.html',
  // Note: Assuming styles are handled either globally or in a separate file if needed
  // styleUrls: ['./app-layout.css'],
})
export class AppLayoutComponent implements OnInit {
  collapsed = false;

  // ✅ NEW FIELDS for Reminder System
  currentReminder: MemoryReminder | null = null;
  audioURL: string = '';
  audioPlayer: HTMLAudioElement | null = null;

  // Navigation Items (kept from your original code)
  navItems = [
    { label: 'Dashboard', route: '/dashboard', icon: '📊' },
    { label: 'Add Memory', route: '/add-memory', icon: '🧠' },
    { label: 'Memories', route: '/memories', icon: '💓' },
    { label: 'Connect Family', route: '/connect-family', icon: '👨‍👩‍👧‍👦' },
    { label: 'Location', route: '/location', icon: '📍' },
    { label: 'Photo contacts', route: '/photocontacts', icon: '📞' },
    { label: 'My People', route: '/mypeople', icon: '🫂' },
    { label: 'Emergency Help', route: '/emergencyhelp', icon: '‼️' },
    { label: 'Settings', route: '/settings', icon: '⚙️' },
  ];

  // ✅ CONSOLIDATED CONSTRUCTOR
  constructor(
    private router: Router,
    private reminderService: MemoryReminderService // Inject the new service
  ) {}

  // ✅ ONINIT METHOD
  ngOnInit(): void {
    // 1. Subscribe to reminders from the service
    this.reminderService.currentReminder$.subscribe((reminder) => {
      this.currentReminder = reminder;
      this.audioURL = '';

      // 2. Check for and prepare voice note audio
      if (reminder && reminder.hasVoiceNote) {
        this.audioURL = this.reminderService.getVoiceNoteUrl(reminder.id);

        // Use a slight delay to ensure the audio source is ready
        setTimeout(() => this.playAudio(), 100);
      }
    });
  }

  // Toggle Sidebar Method (from your original code)
  toggleSidebar() {
    this.collapsed = !this.collapsed;
  }

  // Logout Method (from your original code)
  logout() {
    // Clear all user-related local storage
    localStorage.removeItem('pma-userId');
    localStorage.removeItem('pma-username');
    localStorage.removeItem('pma-quickQuestionAnswered');
    localStorage.removeItem('user');

    // Redirect to the authentication page
    this.router.navigate(['/auth']);
  }

  // ✅ Play Audio Method
  playAudio(): void {
    if (this.audioURL) {
      // Stop any currently playing audio
      if (this.audioPlayer) {
        this.audioPlayer.pause();
        this.audioPlayer.currentTime = 0;
      }
      // Create a new Audio object with the dynamically fetched URL
      this.audioPlayer = new Audio(this.audioURL);
      this.audioPlayer.play().catch((e) => console.error('Error playing audio:', e));
    }
  }

  // ✅ Mark as Read Method
  markAsRead(): void {
    if (this.currentReminder) {
      const memoryId = this.currentReminder.id;

      // Call the service to mark it as read on the backend
      this.reminderService.markAsRead(memoryId).subscribe({
        next: () => {
          console.log(`Reminder ${memoryId} marked as read.`);
          this.currentReminder = null; // Hide notification
          if (this.audioPlayer) this.audioPlayer.pause();
        },
        error: (err) => {
          console.error('Failed to mark reminder as read', err);
          // Still hide the notification locally even on error to prevent obstruction
          this.currentReminder = null;
          if (this.audioPlayer) this.audioPlayer.pause();
        },
      });
    }
  }
}
