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
  editingPhotoId: number | null = null;
  modalImageUrl: string | null = null;

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
  // Open full image
  openImage(url: string) {
    this.modalImageUrl = url;
  }

  // Close full image
  closeImage() {
    this.modalImageUrl = null;
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

  // Edit photo
  editPhoto(photo: PhotoEntry) {
    this.editingPhotoId = photo.id;
    this.form.patchValue({
      caption: photo.caption,
      photo: null, // we don’t replace the photo until user uploads a new one
    });
    this.previewUrl = photo.photoUrl; // show existing photo as preview
  }

  // Delete photo
  deletePhoto(id: number) {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    this.http.delete(`http://localhost:8080/api/mypeople/${id}`).subscribe({
      next: () => {
        this.showToast('Photo deleted successfully!');
        this.loadPhotos();
        // reset form if the deleted photo was being edited
        if (this.editingPhotoId === id) this.resetForm();
      },
      error: () => this.showToast('Failed to delete photo'),
    });
  }

  // Updated addPhoto to handle editing
  addPhoto() {
    if (this.editingPhotoId) {
      // Update existing photo
      const formData = new FormData();
      formData.append('caption', this.form.value.caption);
      if (this.form.value.photo) formData.append('photo', this.form.value.photo);

      this.uploading = true;
      this.http
        .put(`http://localhost:8080/api/mypeople/${this.editingPhotoId}`, formData)
        .subscribe({
          next: () => {
            this.showToast('Photo updated successfully!');
            this.resetForm();
            this.loadPhotos();
            this.uploading = false;
            this.editingPhotoId = null;
          },
          error: () => {
            this.showToast('Failed to update photo');
            this.uploading = false;
          },
        });
    } else {
      // Add new photo
      if (!this.form.value.photo) return;

      const userId = localStorage.getItem('pma-userId');
      if (!userId) return;

      const formData = new FormData();
      formData.append('photo', this.form.value.photo);
      formData.append('caption', this.form.value.caption);
      formData.append('userId', userId);
      this.uploading = true;
      this.http.post(`http://localhost:8080/api/mypeople`, formData).subscribe({
        next: () => {
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
  }

  // Load photos with pagination for logged-in user
  loadPhotos() {
    const userId = localStorage.getItem('pma-userId'); // get logged-in user's ID
    if (!userId) {
      console.error('User not logged in');
      return;
    }

    let params: any = { page: this.page, size: this.size };
    if (this.searchTerm) params.search = this.searchTerm;

    this.http
      .get<{ data: PhotoEntry[]; total: number }>(
        `http://localhost:8080/api/mypeople/user/${userId}`,
        { params }
      )
      .subscribe({
        next: (res) => {
          // Fix photo URLs for frontend if they don't start with http
          res.data.forEach((photo) => {
            if (photo.photoUrl && !photo.photoUrl.startsWith('http')) {
              photo.photoUrl = `http://localhost:8080${photo.photoUrl}`;
            }
          });

          this.photos = res.data;
          this.total = res.total;
        },
        error: (err) => {
          console.error('Failed to load user photos', err);
          this.showToast('Failed to load photos');
        },
      });
  }

  onSearch() {
    this.page = 0;
    this.loadPhotos();
  }

  resetForm() {
    this.form.reset();
    this.previewUrl = null;
    this.editingPhotoId = null;
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
