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
  editingContactId: string | null = null; // <-- Track editing mode
  toastMessage = '';
  toastVisible = false;
  previewUrl: string | null = null;

  contacts$ = new BehaviorSubject<PhotoContact[]>([]);
  total = 0;
  page = 0;
  size = 10;
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
      this.previewUrl = (event.target?.result as string) || null;
    };
    reader.readAsDataURL(file);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.size));
  }

  /** 🔹 Add or Update Contact */
  addOrUpdateContact() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fd = new FormData();
    fd.append('userId', localStorage.getItem('pma-userId')!);
    fd.append('name', this.form.value.name.trim());
    fd.append('relationship', this.form.value.relationship.trim());
    fd.append('phone', this.form.value.phone.trim());
    const file: File = this.form.value.photo;
    if (file) fd.append('photo', file);

    this.uploading = true;

    // ✅ If editing, call update API
    if (this.editingContactId) {
      this.svc.updateContact(this.editingContactId, fd).subscribe({
        next: () => {
          this.showToast('Contact updated successfully ✅');
          this.resetForm();
          this.loadContacts(this.page);
        },
        error: () => {
          this.showToast('Failed to update contact ❌');
        },
        complete: () => (this.uploading = false),
      });
    } else {
      // ✅ Else, add new contact
      this.svc.addContact(fd).subscribe({
        next: () => {
          this.showToast('Contact added successfully ✅');
          this.resetForm();
          this.page = 0;
          this.loadContacts();
        },
        error: () => {
          this.showToast('Failed to add contact ❌');
        },
        complete: () => (this.uploading = false),
      });
    }
  }

  /** 🔹 Load Contact Data into Form for Editing */
  editContact(contact: PhotoContact) {
    this.editingContactId = contact.id;
    this.form.patchValue({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone,
    });
    this.previewUrl = contact.photoUrl || null;

    // ✅ Open modal for editing
    this.showAddModal = true;

    this.showToast(`Editing ${contact.name}`);
  }

  /** 🔹 Reset Form */
  resetForm() {
    this.form.reset();
    this.previewUrl = null;
    this.editingContactId = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  loadContacts(page = this.page) {
    const userId = localStorage.getItem('pma-userId');
    if (!userId) {
      console.error('User not logged in');
      return;
    }

    this.svc.getUserContacts(userId, page, this.size, this.searchTerm).subscribe({
      next: (res) => {
        // ✅ Fix photo URLs here
        if (res.items) {
          res.items.forEach((c) => {
            if (c.photoUrl && !c.photoUrl.startsWith('http')) {
              c.photoUrl = `http://localhost:8080${c.photoUrl}`;
            }
          });
        }

        this.contacts$.next(res.items);
        this.total = res.total;
        this.page = res.page;
        this.size = res.size;
      },
      error: (err) => console.error(err),
    });
  }

  deleteContact(id: string) {
    if (confirm('Are you sure you want to delete this contact?')) {
      this.svc.deleteContact(id).subscribe({
        next: () => {
          this.showToast('Contact deleted successfully!');
          this.loadContacts(); // Refresh list
        },
        error: (err) => {
          console.error(err);
          this.showToast('Failed to delete contact!');
        },
      });
    }
  }
  modalImageUrl: string | null = null;

  openImage(url: string | undefined) {
    if (url) this.modalImageUrl = url;
  }

  closeImage() {
    this.modalImageUrl = null;
  }

  onSearch() {
    this.page = 0;
    this.loadContacts(0);
  }

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

  callNumber(phone: string) {
    window.location.href = `tel:${phone}`;
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 3000);
  }
  showAddModal: boolean = false; // Controls visibility of Add Contact modal

  // Function to open the Add Contact modal
  openAddModal() {
    this.resetForm(); // Optional: clears any previous data
    this.editingContactId = null; // Ensure we’re not editing
    this.showAddModal = true;
  }

  // Function to close the Add Contact modal
  closeAddModal() {
    this.showAddModal = false;
  }
}
