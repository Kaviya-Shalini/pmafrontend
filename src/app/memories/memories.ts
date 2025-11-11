import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
interface Memory {
  id: string;
  title: string;
  category: string;
  description: string;
  filePath?: string;
  voicePath?: string;
  createdAt?: string;

  // ✅ Add these new optional fields
  medicationName?: string;
  dosage?: string;
  storageLocation?: string;
}

@Component({
  selector: 'app-memories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './memories.html',
  styleUrls: ['./memories.css'],
})
export class MemoriesComponent implements OnInit {
  memories: Memory[] = [];
  filteredMemories: Memory[] = [];
  selectedMemory: Memory | null = null;

  searchTerm: string = '';
  page: number = 0;
  size: number = 8;
  totalPages: number = 0;
  showConfirmDialog: boolean = false;
  confirmedMemoryId: string = '';
  userId: string | null = null;
  // 👈 logged-in user's ID

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.userId = localStorage.getItem('pma-userId');
    if (!this.userId) {
      console.error('User ID not found in localStorage');
      return;
    }

    this.loadMemories();
  }

  // ✅ Fetch only memories of the logged-in user
  loadMemories(): void {
    if (!this.userId) return;

    const url = `http://localhost:8080/api/memories/user/${this.userId}?page=${this.page}&size=${this.size}`;
    this.http.get(url).subscribe((res: any) => {
      this.memories = res.content || [];
      this.filteredMemories = this.memories;
      this.totalPages = res.totalPages || 1;
    });
  }
  // ✅ Search only within the user's memories
  searchMemories(): void {
    const term = this.searchTerm.trim();
    if (!this.userId) return;

    const url = `http://localhost:8080/api/memories/user/${this.userId}?page=0&size=${this.size}&search=${term}`;
    this.http.get(url).subscribe((res: any) => {
      this.memories = res.content || [];
      this.filteredMemories = this.memories;
      this.totalPages = res.totalPages || 1;
    });
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadMemories();
    }
  }

  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.loadMemories();
    }
  }

  openMemory(memory: any): void {
    this.selectedMemory = memory;
  }

  closeModal(): void {
    this.selectedMemory = null;
  }

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
        const url = window.URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch((err) => console.error('Audio play error:', err));
      });
  }

  confirmDelete(memoryId: string) {
    this.confirmedMemoryId = memoryId;
    this.showConfirmDialog = true;
    this.selectedMemory = null;
  }

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
        error: () => {
          this.toastr.error('Failed to delete memory', 'Error');
          this.cancelDelete();
        },
      });
  }
}
