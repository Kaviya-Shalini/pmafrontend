import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
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
  showConfirmDialog: boolean = false;
  confirmedMemoryId: string = '';
  userId: string = '';
  constructor(private http: HttpClient, private toastr: ToastrService, private router: Router) {}

  ngOnInit(): void {
    // 👇 **ADD THIS LOGIC TO GET THE USER ID**
    // Get the user from local storage (assuming you store it there after login)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.userId = user?.id; // Or however the ID is stored in your user object

    if (this.userId) {
      this.loadMemories();
    } else {
      this.toastr.error(
        'Could not identify the current user. Please log in again.',
        'Authentication Error'
      );
    }
  }

  // 🔹 Load memories from backend with pagination
  loadMemories(): void {
    // Now this URL will be correct
    this.http
      .get(
        `http://localhost:8080/api/memories/user/${this.userId}?page=${this.page}&size=${this.size}`
      )
      .subscribe((res: any) => {
        this.memories = res.content || res;
        this.filteredMemories = this.memories;
        this.totalPages = res.totalPages || 1;
      });
  }

  // 🔹 Search memories by title or category
  searchMemories(): void {
    const term = this.searchTerm.trim();
    // And this URL will also be correct
    this.http
      .get(
        `http://localhost:8080/api/memories/user/${this.userId}?page=0&size=${this.size}&search=${term}`
      )
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
  // 🔹 Show delete confirmation
  confirmDelete(memoryId: string) {
    this.confirmedMemoryId = memoryId;
    this.showConfirmDialog = true;
    this.selectedMemory = null; // hide the details modal
  }

  // 🔹 Cancel delete
  cancelDelete() {
    this.showConfirmDialog = false;
    this.confirmedMemoryId = '';
  }
  deleteMemory(memoryId: string): void {
    this.http
      .delete<{ success: boolean; message: string }>(
        `http://localhost:8080/api/memories/${memoryId}`
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.memories = this.memories.filter((m) => m.id !== memoryId);
            if (this.selectedMemory?.id === memoryId) this.selectedMemory = null;
            this.toastr.success(res.message, 'Deleted');
          } else {
            this.toastr.error(res.message, 'Error');
          }
          this.cancelDelete();
        },
        error: (err) => {
          this.toastr.error('Failed to delete memory', 'Error');
          this.cancelDelete();
        },
      });
  }
}
