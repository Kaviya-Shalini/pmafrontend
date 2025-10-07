import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Chart, registerables, ChartConfiguration, ChartOptions } from 'chart.js';
import { RouterModule } from '@angular/router';

Chart.register(...registerables);

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

  memories: any[] = [];
  recentMemories: any[] = [];
  user: any = null;
  today: Date = new Date();
  reminders: any[] = [];
  activeChart: 'bar' | 'line' | 'pie' = 'bar';
  motivationMessage: string = '';
  private charts: Chart[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUser();
    this.setMotivationMessage();
  }

  ngAfterViewInit(): void {
    // Charts will be created after data is loaded
  }
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
    // Pick a random motivational message and assign it to the property
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
        // Ensure all date strings are valid Date objects
        this.memories = res.map((m) => ({ ...m, createdAt: new Date(m.createdAt) }));
        this.recentMemories = this.memories
          .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5);

        // We need to make sure the view is initialized before creating charts
        setTimeout(() => this.createCharts(), 0);
      });
  }

  setActiveChart(chartType: 'bar' | 'line' | 'pie') {
    this.activeChart = chartType;
  }

  getCategories(): string[] {
    if (!this.memories || this.memories.length === 0) return [];
    const categories = this.memories.map((m) =>
      m.category === 'other' && m.customCategory ? m.customCategory : m.category
    );
    return Array.from(new Set(categories.filter((c) => c)));
  }

  getMostActiveDay(): string {
    if (!this.memories.length) return 'N/A';
    const dayCounts: Record<string, number> = {};
    this.memories.forEach((m) => {
      if (m.createdAt && !isNaN(m.createdAt.getTime())) {
        const day = m.createdAt.toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });
    if (Object.keys(dayCounts).length === 0) return 'N/A';
    return Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0];
  }

  getTopCategory(): string {
    if (!this.memories.length) return 'N/A';
    const counts: Record<string, number> = {};
    this.memories.forEach((m) => {
      const cat = m.category === 'other' && m.customCategory ? m.customCategory : m.category;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
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

  private getChartOptions(title: string): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#9ca3af' },
        },
        title: {
          display: false,
          text: title,
          color: '#e5e7eb',
        },
      },
      scales: {
        x: {
          ticks: { color: '#9ca3af' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
        },
        y: {
          ticks: { color: '#9ca3af' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
        },
      },
    };
  }

  createPieChart() {
    const ctx = this.pieChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const categoryCounts: Record<string, number> = {};
    this.memories.forEach((m) => {
      const cat = m.category === 'other' && m.customCategory ? m.customCategory : m.category;
      if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    if (this.charts.find((c) => c.canvas === this.pieChartRef.nativeElement)) {
      this.destroyCharts();
    }

    const gradientColors = [
      ctx.createLinearGradient(0, 0, 150, 150),
      ctx.createLinearGradient(0, 0, 150, 150),
      ctx.createLinearGradient(0, 0, 150, 150),
      ctx.createLinearGradient(0, 0, 150, 150),
      ctx.createLinearGradient(0, 0, 150, 150),
    ];
    gradientColors[0].addColorStop(0, '#818cf8');
    gradientColors[0].addColorStop(1, '#4f46e5');
    gradientColors[1].addColorStop(0, '#a855f7');
    gradientColors[1].addColorStop(1, '#7c3aed');
    gradientColors[2].addColorStop(0, '#ec4899');
    gradientColors[2].addColorStop(1, '#db2777');
    gradientColors[3].addColorStop(0, '#facc15');
    gradientColors[3].addColorStop(1, '#f59e0b');
    gradientColors[4].addColorStop(0, '#34d399');
    gradientColors[4].addColorStop(1, '#10b981');

    const pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [
          {
            data: Object.values(categoryCounts),
            backgroundColor: gradientColors,
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
          legend: {
            position: 'bottom',
            labels: { color: '#f9fafb', font: { size: 13 } },
          },
          tooltip: {
            backgroundColor: '#1e1b4b',
            titleColor: '#fff',
            bodyColor: '#ddd',
            borderWidth: 1,
            borderColor: '#fff',
          },
        },
        animation: {
          animateRotate: true,
          animateScale: true,
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

    const labels = Object.keys(dailyCounts);
    const data = Object.values(dailyCounts);

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(99,102,241,0.9)');
    gradient.addColorStop(1, 'rgba(79,70,229,0.4)');

    const barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Uploads',
            data,
            backgroundColor: gradient,
            borderColor: '#6366f1',
            borderWidth: 2,
            borderRadius: 6,
            hoverBackgroundColor: 'rgba(167,139,250,0.9)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e1b4b',
            titleColor: '#fff',
            bodyColor: '#ddd',
            borderWidth: 1,
            borderColor: '#fff',
          },
        },
        scales: {
          x: {
            ticks: { color: '#f9fafb' },
            grid: { color: 'rgba(255,255,255,0.08)' },
          },
          y: {
            ticks: { color: '#f9fafb' },
            grid: { color: 'rgba(255,255,255,0.08)' },
            beginAtZero: true,
          },
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart',
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

    const labels = Object.keys(trendCounts);
    const data = Object.values(trendCounts);

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(236,72,153,0.5)');
    gradient.addColorStop(1, 'rgba(236,72,153,0)');

    const lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Upload Trend',
            data,
            borderColor: '#f472b6',
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#f9a8d4',
            pointBorderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e1b4b',
            titleColor: '#fff',
            bodyColor: '#ddd',
            borderWidth: 1,
            borderColor: '#fff',
          },
        },
        scales: {
          x: {
            ticks: { color: '#f9fafb' },
            grid: { color: 'rgba(255,255,255,0.08)' },
          },
          y: {
            ticks: { color: '#f9fafb' },
            grid: { color: 'rgba(255,255,255,0.08)' },
            beginAtZero: true,
          },
        },
        animation: {
          duration: 1200,
          easing: 'easeOutCubic',
        },
      },
    });

    this.charts.push(lineChart);
  }
  getMoodScore(): number {
    if (!this.memories.length) return 0;
    const categories = this.memories.map((m) => m.category);
    const positiveCategories = ['family', 'travel', 'friends', 'celebration'];
    const positiveCount = categories.filter((c) => positiveCategories.includes(c)).length;
    return Math.round((positiveCount / this.memories.length) * 100);
  }
  ngOnDestroy(): void {
    this.destroyCharts();
  }
}
