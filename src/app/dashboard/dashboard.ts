import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Chart, registerables, ChartOptions } from 'chart.js';
import { RouterModule } from '@angular/router';
import { AlertService } from '../location/alert.service';
import { Subscription, interval } from 'rxjs';

Chart.register(...registerables);

// Interface for the alert data structure
interface Alert {
  message: string;
  patientName: string;
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
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

  constructor(private http: HttpClient, private alertService: AlertService) {}

  ngOnInit(): void {
    this.loadUser();
    this.setMotivationMessage();

    const userId = localStorage.getItem('pma-userId');
    if (userId) {
      // Start polling for alerts every 5 seconds.
      // The logic is now entirely self-contained within this component.
      this.pollingSubscription = interval(1000).subscribe(() => {
        this.alertService.fetchAlertsForUser(userId).subscribe((newAlerts) => {
          if (newAlerts && newAlerts.length > 0) {
            // Add the new alerts to this component's local `alerts` array.
            this.alerts.push(...newAlerts);
            // Set a timer to clear the alerts from this dashboard after 30 seconds.
            setTimeout(() => {
              this.alerts = [];
            }, 30000);
          }
        });
      });
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    // Clean up the subscription when the component is destroyed to prevent memory leaks.
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  ngAfterViewInit(): void {
    // Charts are created after memory data is loaded.
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
