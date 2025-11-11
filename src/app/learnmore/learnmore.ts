import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-learnmore',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './learnmore.html',
  styleUrl: './learnmore.css',
})
export class Learnmore implements OnInit, OnDestroy {
  currentIndex = 0;
  intervalId: any;

  features = [
    {
      icon: '⏰',
      title: 'Smart Daily Reminders',
      description:
        'Never miss medications, appointments, or tasks again — MemoLink’s gentle reminders adapt to your loved one’s daily rhythm and needs.',
    },
    {
      icon: '📓',
      title: 'Interactive Memory Journal',
      description:
        'Store memories through notes, voice logs, or pictures — helping patients recall joyful moments and feel emotionally grounded.',
    },
    {
      icon: '🔒',
      title: 'Encrypted Document Vault',
      description:
        'Securely store critical files — prescriptions, reports, and medical info — protected by advanced encryption and family key sharing.',
    },
    {
      icon: '👨‍👩‍👧‍👦',
      title: 'Family Connection',
      description:
        'Enable family members to share reminders, notes, and emotional support directly — ensuring constant connection and care.',
    },
    {
      icon: '💬',
      title: 'Track Patient Activity',
      description:
        'Enable family members to track user activity with daily notifications and responses.',
    },
    {
      icon: '🖼️',
      title: 'Photo Contacts',
      description:
        'Photo contact feature helps Alzheimer’s patients easily identify family members and contact them.',
    },
    {
      icon: '📍',
      title: 'Location Tracking',
      description:
        'If the user moves away from their safe zone, notifications are instantly sent to connected family members.',
    },
    {
      icon: '📱',
      title: 'Accessible & Mobile Friendly',
      description:
        'Simple design, high contrast visuals, and intuitive navigation — built for elderly users with comfort in mind.',
    },
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Auto-scroll every 4 seconds
    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.features.length;
    }, 4000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
