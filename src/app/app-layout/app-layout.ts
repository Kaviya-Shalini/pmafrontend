import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RoutineNotificationService } from '../routine-tracker/routine-notification.service';
// Import the MemoryReminder interface and service
import { MemoryReminder, MemoryReminderService } from '../memories/MemoryReminderService';
import { Subscription } from 'rxjs';
import { NgZone } from '@angular/core';
@Component({
  selector: 'app-layout',
  standalone: true,
  // Ensure you include CommonModule and RouterModule for the template
  imports: [CommonModule, RouterModule],
  templateUrl: './app-layout.html',
})
export class AppLayoutComponent implements OnInit {
  collapsed = false;

  // ✅ NEW FIELDS for Reminder System
  currentReminder: MemoryReminder | null = null;
  audioURL: string = '';
  audioPlayer: HTMLAudioElement | null = null;
  private notificationPermission: NotificationPermission = 'default';
  toastMsg: string | null = null;
  // const messageText = msg || '📅 Your family has updated your routine.';

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
    { label: 'RoutineTracker', route: '/routinetracker', icon: '⏰' },
    { label: 'Settings', route: '/settings', icon: '⚙️' },
  ];

  // ✅ CONSOLIDATED CONSTRUCTOR
  constructor(
    private router: Router,
    private reminderService: MemoryReminderService,
    private routineNotificationService: RoutineNotificationService,
    private zone: NgZone // Inject the new service
  ) {}

  // ✅ NEW METHOD: Request Permission for Notifications
  requestNotificationPermission(): void {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications.');
      return;
    }

    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        this.notificationPermission = permission;
        if (permission === 'granted') {
          console.log('Notification permission granted.');
        }
      });
    } else {
      this.notificationPermission = Notification.permission;
    }
  }

  // ✅ NEW METHOD: Show Native Push Notification
  showNativeNotification(reminder: MemoryReminder): void {
    if (this.notificationPermission === 'granted') {
      const options: NotificationOptions = {
        body: reminder.description,
        icon: 'favicon.ico', // Ensure you have a favicon.ico in your public folder
        tag: reminder.id, // Use memory ID to prevent duplicate popups for the same event
      };

      // Create and display the native push notification
      const notification = new Notification(reminder.title, options);

      // Optional: Add click handler to focus the window when clicked
      notification.onclick = () => window.focus();
    }
  }

  // ngOnInit(): void {
  //   // 1. Get the authenticated user ID from local storage
  //   const userId = localStorage.getItem('pma-userId');

  //   if (userId) {
  //     // 2. Initialize the WebSocket connection (for LIVE updates)
  //     // This solves the problem of not getting real-time notifications.
  //     this.reminderService.initialize(userId);
  //     console.log('Attempting to initialize MemoryReminderService for user:', userId);

  //     // 3. Poll for any reminders that were triggered while the client was offline
  //     // This solves the problem of reminders disappearing on refresh.
  //     this.reminderService.getDueRemindersOnLoad(userId).subscribe(
  //       // We subscribe to trigger the API call. The service's map() logic
  //       // handles updating the currentReminder$ stream if a reminder is found.
  //       () => console.log('Checked for pending reminders on load.')
  //     );
  //   } else {
  //     console.warn(
  //       'Cannot initialize MemoryReminderService: User ID not found in localStorage. WebSocket connection skipped.'
  //     );
  //   }

  //   // 4. Request permission for native notifications
  //   this.requestNotificationPermission();

  // 5. Subscribe to the reminder stream (receives reminders from WebSocket OR HTTP Poll)
  //   this.reminderService.currentReminder$.subscribe((reminder) => {
  //     this.currentReminder = reminder;
  //     this.audioURL = '';

  //     if (reminder) {
  //       // This logic executes when a reminder is received (live) or found (on load)
  //       this.showNativeNotification(reminder);

  //       if (reminder.hasVoiceNote) {
  //         this.audioURL = this.reminderService.getVoiceNoteUrl(reminder.id);
  //         setTimeout(() => this.playAudio(), 100);
  //       }
  //     }
  //   });
  // }
  private routineSub?: Subscription;
  newRoutineNotification = false;
  ngOnInit(): void {
    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));

    const userId = localStorage.getItem('pma-userId');
    if (!userId) {
      console.warn('⚠️ Missing user ID in localStorage. WebSocket connection skipped.');
      return;
    }

    // ✅ Step 1: Request notifications early
    this.requestNotificationPermission();

    // ✅ Step 2: Initialize services
    this.reminderService.initialize(userId);
    this.routineNotificationService.connect(userId);
    console.log('✅ Connected services for user:', userId);

    // ✅ Step 3: Subscribe to reminders (ensure Angular zone triggers)
    this.reminderService.currentReminder$.subscribe((reminder) => {
      this.zone.run(() => {
        console.log('🔔 Received reminder:', reminder);
        this.currentReminder = reminder;
        this.audioURL = '';

        if (reminder) {
          this.showNativeNotification(reminder);
          if (reminder.hasVoiceNote) {
            this.audioURL = this.reminderService.getVoiceNoteUrl(reminder.id);
            setTimeout(() => this.playAudio(), 100);
          }
        }
      });
    });

    // ✅ Step 4: Load user and handle routine notifications
    fetch(`http://localhost:8080/api/user/${userId}`)
      .then((res) => res.json())
      .then((user) => {
        const isAlzheimerPatient =
          user.isAlzheimer === true ||
          user.condition?.toLowerCase() === 'alzheimer' ||
          user.diagnosis?.toLowerCase() === 'alzheimer' ||
          localStorage.getItem('pma-role') === 'patient';

        console.log('🧠 Alzheimer patient?', isAlzheimerPatient);

        this.routineSub = this.routineNotificationService.notification$.subscribe((msg) => {
          if (msg && isAlzheimerPatient) {
            console.log('📩 Routine Notification:', msg);
            const messageText = msg || '📅 Your family has updated your routine.';
            if (confirm(`${messageText}\n\nTap OK to view Routine Tracker.`)) {
              setTimeout(() => this.router.navigate(['/routinetracker']), 200);
            }
          }
        });

        this.reminderService.getDueRemindersOnLoad(userId).subscribe(() => {
          console.log('Checked for pending reminders on load.');
        });
      })
      .catch((err) => console.error('Failed to load user info', err));
  }

  showRoutineToast(message: string) {
    this.toastMsg = message;
    setTimeout(() => (this.toastMsg = null), 4000); // hide after 4s
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
    this.router.navigate(['/welcome']);
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
  // ✅ Cleanly disconnect WebSockets
  ngOnDestroy(): void {
    this.routineSub?.unsubscribe();
    this.routineNotificationService.disconnect();
  }
  // ✅ NEW: Automatically collapse sidebar on smaller screens
  handleResize(): void {
    if (window.innerWidth <= 1024 && !this.collapsed) {
      this.collapsed = true;
    } else if (window.innerWidth > 1024 && this.collapsed) {
      // Optional: auto-expand again on large screens
      this.collapsed = false;
    }
  }
  onNavItemClick() {
    // Auto-close sidebar if on small screens
    if (window.innerWidth <= 1024 && !this.collapsed) {
      this.collapsed = true;
    }
  }
}
