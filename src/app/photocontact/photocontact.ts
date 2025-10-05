import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { PhotoContactsService, PhotoContact } from './photocontactservice';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Route } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-photo-contacts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './photocontact.html',
  styleUrls: ['./photocontact.css'],
})
export class PhotoContactsComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  form: FormGroup;
  uploading = false;
  toastMessage = '';
  toastVisible = false;
  previewUrl: string | null = null;
  // list & paging
  contacts$ = new BehaviorSubject<PhotoContact[]>([]);
  total = 0;
  page = 0;
  size = 10; // 10 per requirement
  searchTerm = '';

  constructor(private fb: FormBuilder, private svc: PhotoContactsService) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(60)]],
      relationship: ['', [Validators.required, Validators.maxLength(30)]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{6,20}$/)]],
      photo: [null],
    });
  }

  ngOnInit(): void {
    this.loadContacts();
  }

  // Preview file
  onFileChange(e: Event) {
    const el = e.target as HTMLInputElement;
    const file = el.files && el.files[0];
    if (!file) {
      this.previewUrl = null;
      this.form.patchValue({ photo: null });
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image.');
      this.fileInput.nativeElement.value = '';
      return;
    }
    this.form.patchValue({ photo: file });

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      // readAsDataURL returns a string, so cast safely here
      this.previewUrl = (event.target?.result as string) || null;
    };
    reader.readAsDataURL(file);
  }
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.size));
  }

  // Build FormData and post
  async addContact() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const fd = new FormData();
    fd.append('name', this.form.value.name.trim());
    fd.append('relationship', this.form.value.relationship.trim());
    fd.append('phone', this.form.value.phone.trim());
    const file: File = this.form.value.photo;
    if (file) fd.append('photo', file);

    this.uploading = true;
    this.svc.addContact(fd).subscribe({
      next: (res) => {
        this.showToast('Contact added successfully ✅');
        this.resetForm();
        // reload page 0 to show newest contact (you may choose current page)
        this.page = 0;
        this.loadContacts();
      },
      error: (err) => {
        console.error(err);
        this.showToast('Failed to add contact. Try again.');
      },
      complete: () => (this.uploading = false),
    });
  }

  resetForm() {
    this.form.reset();
    this.previewUrl = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  loadContacts(page = this.page) {
    this.svc.getContacts(page, this.size, this.searchTerm).subscribe({
      next: (res) => {
        this.contacts$.next(res.items);
        this.total = res.total;
        this.page = res.page;
        this.size = res.size;
      },
      error: (err) => console.error(err),
    });
  }

  // Search action
  onSearch() {
    this.page = 0;
    this.loadContacts(0);
  }

  // Pagination helpers
  nextPage() {
    if ((this.page + 1) * this.size >= this.total) return;
    this.page++;
    this.loadContacts(this.page);
  }
  prevPage() {
    if (this.page === 0) return;
    this.page--;
    this.loadContacts(this.page);
  }

  // Initiate call using tel: link — opens phone dialer on mobile or softphone on desktop
  callNumber(phone: string) {
    // use anchor tel: in template — here kept for additional logic if needed
    window.location.href = `tel:${phone}`;
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 3000);
  }
}
