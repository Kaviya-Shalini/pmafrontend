import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-memories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './memories.html',
  styleUrls: ['./memories.css'],
})
export class MemoriesComponent implements OnInit {
  memories: any[] = [];
  filteredMemories: any[] = [];
  selectedMemory: any = null;

  searchTerm: string = '';
  page: number = 0;
  size: number = 8;
  totalPages: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadMemories();
  }

  // 🔹 Load memories from backend with pagination
  loadMemories(): void {
    this.http
      .get(`http://localhost:8080/api/memories?page=${this.page}&size=${this.size}`)
      .subscribe((res: any) => {
        this.memories = res.content || res;
        this.filteredMemories = this.memories;
        this.totalPages = res.totalPages || 1;
      });
  }

  // 🔹 Search memories by title or category
  searchMemories(): void {
    const term = this.searchTerm.trim();
    this.http
      .get(`http://localhost:8080/api/memories?page=0&size=${this.size}&search=${term}`)
      .subscribe((res: any) => {
        this.memories = res.content || [];
        this.filteredMemories = this.memories;
        this.totalPages = res.totalPages || 1;
      });
  }

  // 🔹 Pagination - previous page
  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadMemories();
    }
  }

  // 🔹 Pagination - next page
  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadMemories();
    }
  }

  // 🔹 Open memory in modal
  openMemory(memory: any): void {
    this.selectedMemory = memory;
  }

  // 🔹 Close modal
  closeModal(): void {
    this.selectedMemory = null;
  }

  // 🔹 Download attached file
  downloadFile(memoryId: string): void {
    this.http
      .get(`http://localhost:8080/api/memories/${memoryId}/download?type=file`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'memory-file';
        a.click();
        window.URL.revokeObjectURL(url);
      });
  }

  downloadVoice(memoryId: string): void {
    this.http
      .get(`http://localhost:8080/api/memories/${memoryId}/download?type=voice`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        console.log('Blob type:', blob.type); // should be 'audio/mpeg' or similar
        const url = window.URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch((err) => console.error('Audio play error:', err));
      });
  }
}
