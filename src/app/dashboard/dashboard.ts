// in kaviya-shalini/pmafrontend/pmafrontend-a7b6258709fbf669e5a3ddf14669fdf8c0aba887/src/app/dashboard/dashboard.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { RouterModule } from '@angular/router';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent implements OnInit {
  @ViewChild('pieChart') pieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;

  memories: any[] = [];
  recentMemories: any[] = [];
  user: any = null;
  pieChart: any;
  barChart: any;
  lineChart: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUser();
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
  // Get unique categories
  getCategories(): string[] {
    const categories = this.memories.map((m) =>
      m.category === 'other' ? m.customCategory : m.category
    );
    return Array.from(new Set(categories));
  }

  // Most active day (the day with the most memories)
  getMostActiveDay(): string {
    if (!this.memories.length) return '-';
    const dayCounts: Record<string, number> = {};
    this.memories.forEach((m) => {
      const day = new Date(m.createdAt).toLocaleDateString();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const sortedDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]);
    return sortedDays[0][0];
  }

  // Top category (most uploaded category)
  getTopCategory(): string {
    if (!this.memories.length) return '-';
    const counts: Record<string, number> = {};
    this.memories.forEach((m) => {
      const cat = m.category === 'other' ? m.customCategory : m.category;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const sortedCats = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sortedCats[0][0];
  }

  loadMemories(userId: string) {
    this.http.get(`http://localhost:8080/api/memories/recent/${userId}`).subscribe((res: any) => {
      this.memories = res;
      this.recentMemories = this.memories
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      if (this.pieChartRef && this.barChartRef && this.lineChartRef) {
        this.createPieChart();
        this.createBarChart();
        this.createLineChart();
      }
    });
  }

  createPieChart() {
    const ctx = this.pieChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return; // stop if context is not ready
    const categoryCounts: any = {};
    this.memories.forEach((m) => {
      const cat = m.category === 'other' ? m.customCategory : m.category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);

    if (this.pieChart) this.pieChart.destroy();
    this.pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: ['#f43f5e', '#6366f1', '#10b981', '#facc15', '#8b5cf6'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#fff' } },
        },
      },
    });
  }

  createBarChart() {
    const ctx = this.barChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const dayCounts: any = {};

    this.memories.forEach((m) => {
      const day = new Date(m.createdAt).toLocaleDateString();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const labels = Object.keys(dayCounts);
    const data = Object.values(dayCounts);

    if (this.barChart) this.barChart.destroy();
    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Daily Uploads',
            data,
            backgroundColor: '#3b82f6',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#fff' } },
          y: { ticks: { color: '#fff' } },
        },
      },
    });
  }

  createLineChart() {
    const ctx = this.lineChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const dayCounts: any = {};

    this.memories.forEach((m) => {
      const day = new Date(m.createdAt).toLocaleDateString();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const labels = Object.keys(dayCounts);
    const data = Object.values(dayCounts);

    if (this.lineChart) this.lineChart.destroy();
    this.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Uploads Trend',
            data,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249,115,22,0.3)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#fff' } } },
        scales: {
          x: { ticks: { color: '#fff' } },
          y: { ticks: { color: '#fff' } },
        },
      },
    });
  }
}
