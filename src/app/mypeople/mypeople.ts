import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface PhotoEntry {
  id: number;
  photoUrl: string;
  caption: string;
  createdAt: string;
}

@Component({
  selector: 'app-mypeople',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './mypeople.html',
  styleUrls: ['./mypeople.css'],
})
export class MyPeopleComponent implements OnInit {
  private http = inject(HttpClient);
  fb = inject(FormBuilder);

  form: FormGroup;
  photos: PhotoEntry[] = [];
  page = 0;
  size = 6;
  total = 0;
  searchTerm = '';
  previewUrl: string | null = null;
  uploading = false;
  toastVisible = false;
  toastMessage = '';

  constructor() {
    this.form = this.fb.group({
      caption: [''],
      photo: [null],
    });
  }

  ngOnInit(): void {
    this.loadPhotos();
  }

  // Preview file
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = () => (this.previewUrl = reader.result as string);
      reader.readAsDataURL(input.files[0]);
      this.form.patchValue({ photo: input.files[0] });
    }
  }

  // Add photo
  addPhoto() {
    if (!this.form.value.photo) return;

    const formData = new FormData();
    formData.append('photo', this.form.value.photo);
    formData.append('caption', this.form.value.caption);

    this.uploading = true;
    this.http.post<any>('http://localhost:8080/api/mypeople', formData).subscribe({
      next: (res) => {
        this.showToast('Photo added successfully!');
        this.resetForm();
        this.loadPhotos();
        this.uploading = false;
      },
      error: () => {
        this.showToast('Failed to add photo');
        this.uploading = false;
      },
    });
  }

  // Load photos with pagination
  loadPhotos() {
    let params: any = { page: this.page, size: this.size };
    if (this.searchTerm) params.search = this.searchTerm;

    this.http
      .get<{ data: PhotoEntry[]; total: number }>('http://localhost:8080/api/mypeople', { params })
      .subscribe((res) => {
        this.photos = res.data;
        this.total = res.total;
      });
  }

  onSearch() {
    this.page = 0;
    this.loadPhotos();
  }

  resetForm() {
    this.form.reset();
    this.previewUrl = null;
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      this.loadPhotos();
    }
  }

  nextPage() {
    if ((this.page + 1) * this.size < this.total) {
      this.page++;
      this.loadPhotos();
    }
  }

  get totalPages() {
    return Math.ceil(this.total / this.size) || 1;
  }

  showToast(message: string) {
    this.toastMessage = message;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 2500);
  }
}
