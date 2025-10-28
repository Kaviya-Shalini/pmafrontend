import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Chart, registerables, ChartOptions } from 'chart.js';
import { RouterModule } from '@angular/router';
import { AlertService } from '../location/alert.service';
import { Subscription, interval } from 'rxjs';
import { RoutineService, RoutineNotification } from '../routine-tracker/routine.service';
import { NgIf } from '@angular/common';
Chart.register(...registerables);

// Interface for the alert data structure
interface Alert {
  message: string;
  patientName: string;
  latitude: number;
  longitude: number;
}
// Interface for the user's current coordinates (family member's location)
interface Coords {
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, NgIf],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pieChart') pieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;

  // Component state properties
  memories: any[] = [];
  recentMemories: any[] = [];
  user: any = null;
  today: Date = new Date();
  activeChart: 'bar' | 'line' | 'pie' = 'bar';
  motivationMessage: string = '';
  private charts: Chart[] = [];
  alerts: Alert[] = [];
  private pollingSubscription!: Subscription;
  activeRoutineNotification: RoutineNotification | null = null;
  private routineSubscription!: Subscription;

  constructor(
    private http: HttpClient,
    private alertService: AlertService,
    private routineService: RoutineService
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.setMotivationMessage();

    const userId = localStorage.getItem('pma-userId');
    if (userId) {
      // --- Existing Logic: Start polling for location alerts ---
      this.pollingSubscription = interval(1000).subscribe(() => {
        this.alertService.fetchAlertsForUser(userId).subscribe((newAlerts) => {
          if (newAlerts && newAlerts.length > 0) {
            // If new alerts exist (meaning the persistent alert is active)
            // Replace the local array with the current active alerts.
            this.alerts = newAlerts;
          } else {
            // If no alerts are returned, the backend has resolved and cleared them.
            // Clear the local display.
            this.alerts = [];
          }
        });
      });

      // --- NEW LOGIC: Routine WebSocket connection and subscription ---
      // 1. Connect to the routine WebSocket using the patient's ID
      console.log(`WebSocket attempting connection using User ID: ${userId}`);

      this.routineService.connect(userId);

      // 2. Subscribe to the routine notification Observable from the service
      this.routineSubscription = this.routineService.routineNotification$.subscribe(
        (notification) => {
          // When a new routine notification arrives, set it as the active notification
          this.activeRoutineNotification = notification;
          // This will trigger the modal/popup in dashboard.html
        }
      );
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    // Clean up the subscription when the component is destroyed to prevent memory leaks.
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    if (this.routineSubscription) {
      this.routineSubscription.unsubscribe();
    }
    this.routineService.disconnect();
  }

  ngAfterViewInit(): void {
    // Charts are created after memory data is loaded.
  }
  // --- NEW FUNCTIONALITY: DANGER MAP DIRECTIONS ---

  /**
   * Prompts the family member's browser for their current location and
   * opens Google Maps directions to the patient's alert location.
   * @param patientLat Patient's latitude from the alert.
   * @param patientLng Patient's longitude from the alert.
   */
  getDirectionsToPatient(patientLat: number, patientLng: number): void {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser. Cannot get directions.');
      return;
    }

    // Attempt to get the family member's current location (origin)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin: Coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const destination: Coords = {
          lat: patientLat,
          lng: patientLng,
        };

        this.openGoogleMapsDirections(origin, destination);
      },
      (error) => {
        console.error('Geolocation error:', error);
        // Fallback: If family member's location can't be fetched, just show the patient's location
        // We use a general search/view link in this case.
        this.openGoogleMapsView(patientLat, patientLng);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }

  /**
   * Opens Google Maps for directions.
   * @param origin Family member's location.
   * @param destination Patient's alert location.
   */
  private openGoogleMapsDirections(origin: Coords, destination: Coords): void {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    window.open(url, '_blank');
  }

  /**
   * Opens Google Maps to view a single location (fallback).
   * @param lat Latitude to view.
   * @param lng Longitude to view.
   */
  private openGoogleMapsView(lat: number, lng: number): void {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
    alert(
      'Could not get your current location. Showing the patient’s last reported location instead.'
    );
  }

  // --- Data Loading and UI Methods ---

  getTodayDate(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    };
    return this.today.toLocaleDateString('en-US', options);
  }

  setMotivationMessage(): void {
    const messages = [
      '✨ Keep going, you’re stronger than you think!',
      '🌸 One step at a time, you’re making progress.',
      '🌞 Today is a fresh start—make it beautiful!',
      '💪 Believe in yourself, you’ve got this!',
      '🌈 Every memory matters—cherish today!',
    ];
    this.motivationMessage = messages[Math.floor(Math.random() * messages.length)];
  }

  loadUser() {
    const userId = localStorage.getItem('pma-userId');
    if (userId) {
      this.http.get(`http://localhost:8080/api/user/${userId}`).subscribe((res: any) => {
        this.user = res;
        this.loadMemories(userId);
      });
    }
  }

  loadMemories(userId: string) {
    this.http
      .get<any[]>(`http://localhost:8080/api/memories/recent/${userId}`)
      .subscribe((res: any[]) => {
        this.memories = res.map((m) => ({ ...m, createdAt: new Date(m.createdAt) }));
        this.recentMemories = this.memories
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5);
        setTimeout(() => this.createCharts(), 0);
      });
  }

  // --- Chart Logic ---

  setActiveChart(chartType: 'bar' | 'line' | 'pie') {
    this.activeChart = chartType;
  }

  getTopCategory(): string {
    if (!this.memories.length) return 'N/A';
    const counts: Record<string, number> = {};
    this.memories.forEach((m) => {
      const cat = m.category === 'other' && m.customCategory ? m.customCategory : m.category;
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    if (Object.keys(counts).length === 0) return 'N/A';
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  private createCharts() {
    this.destroyCharts();
    this.createPieChart();
    this.createBarChart();
    this.createLineChart();
  }

  private destroyCharts() {
    this.charts.forEach((chart) => chart.destroy());
    this.charts = [];
  }
  // NEW METHOD: Handles the patient clicking YES/NO
  respondToRoutine(response: 'YES' | 'NO'): void {
    if (!this.activeRoutineNotification) return;

    this.routineService
      .recordResponse(this.activeRoutineNotification.responseId, response)
      .subscribe({
        next: () => {
          console.log(`Routine response recorded: ${response}`);
          this.activeRoutineNotification = null; // Clear the modal after response
        },
        error: (err) => {
          console.error('Failed to record routine response', err);
          alert('Failed to record response. Please try again.');
          this.activeRoutineNotification = null;
        },
      });
  }
  createPieChart() {
    const ctx = this.pieChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const categoryCounts: Record<string, number> = {};
    this.memories.forEach((m) => {
      const cat = m.category === 'other' && m.customCategory ? m.customCategory : m.category;
      if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [
          {
            data: Object.values(categoryCounts),
            backgroundColor: ['#818cf8', '#a855f7', '#ec4899', '#facc15', '#34d399'],
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.3)',
            hoverOffset: 15,
          },
        ],
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#f9fafb', font: { size: 13 } } },
        },
      },
    });
    this.charts.push(pieChart);
  }

  createBarChart() {
    const ctx = this.barChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const dailyCounts: Record<string, number> = {};
    this.memories.forEach((m) => {
      if (m.createdAt && !isNaN(m.createdAt.getTime())) {
        const day = m.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      }
    });

    const barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(dailyCounts),
        datasets: [
          {
            label: 'Uploads',
            data: Object.values(dailyCounts),
            backgroundColor: 'rgba(99,102,241,0.9)',
            borderColor: '#6366f1',
            borderWidth: 2,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#f9fafb' }, grid: { color: 'rgba(255,255,255,0.08)' } },
          y: {
            ticks: { color: '#f9fafb' },
            grid: { color: 'rgba(255,255,255,0.08)' },
            beginAtZero: true,
          },
        },
      },
    });
    this.charts.push(barChart);
  }

  createLineChart() {
    const ctx = this.lineChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const trendCounts: Record<string, number> = {};
    this.memories
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .forEach((m) => {
        if (m.createdAt && !isNaN(m.createdAt.getTime())) {
          const day = m.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          trendCounts[day] = (trendCounts[day] || 0) + 1;
        }
      });

    const lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.keys(trendCounts),
        datasets: [
          {
            label: 'Upload Trend',
            data: Object.values(trendCounts),
            borderColor: '#f472b6',
            fill: false,
            tension: 0.4,
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#f9fafb' }, grid: { color: 'rgba(255,255,255,0.08)' } },
          y: {
            ticks: { color: '#f9fafb' },
            grid: { color: 'rgba(255,255,255,0.08)' },
            beginAtZero: true,
          },
        },
      },
    });
    this.charts.push(lineChart);
  }
}
