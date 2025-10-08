import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { EmergencyContactService, EmergencyContact } from './emergency-contact.service';

@Component({
  selector: 'app-emergencyhelp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './emergencyhelp.html',
})
export class EmergencyHelpComponent implements OnInit {
  form: FormGroup;
  contacts: EmergencyContact[] = [];
  previewUrl: string | ArrayBuffer | null = null;
  editingId: number | null = null;
  searchTerm = '';
  toastVisible = false;
  toastMessage = '';
  modalImageUrl: string | null = null;

  constructor(private fb: FormBuilder, private service: EmergencyContactService) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      relationship: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{8,15}$/)]],
      photo: [null],
    });
  }

  ngOnInit() {
    this.loadContacts();
  }

  loadContacts() {
    this.service.getAll().subscribe({
      next: (data) => (this.contacts = data || []),
      error: () => this.showToast('Failed to load contacts'),
    });
  }

  // Add or Update — send Partial payload to backend
  addOrUpdateContact() {
    if (this.form.invalid) return;

    const payload: Partial<EmergencyContact> = {
      name: this.form.value.name,
      relationship: this.form.value.relationship,
      phone: this.form.value.phone,
      photoUrl: typeof this.previewUrl === 'string' ? this.previewUrl : undefined,
      createdAt: new Date().toISOString(),
    };

    if (this.editingId === null) {
      if (this.contacts.length >= 5) {
        this.showToast('You can only add up to 5 contacts!');
        return;
      }

      this.service.add(payload).subscribe({
        next: (added) => {
          // backend should return saved object with id; if not, assign temporary id
          if (!added.id) {
            added.id = Date.now();
          }
          this.contacts.unshift(added);
          this.showToast('Contact added successfully!');
          this.resetForm();
        },
        error: () => this.showToast('Error adding contact'),
      });
    } else {
      const id = this.editingId;
      this.service.update(id, payload).subscribe({
        next: (updated) => {
          const index = this.contacts.findIndex((c) => c.id === id);
          if (index > -1) this.contacts[index] = updated;
          this.showToast('Contact updated successfully!');
          this.resetForm();
        },
        error: () => this.showToast('Error updating contact'),
      });
    }
  }

  editContact(c: EmergencyContact) {
    // safe assignment (may be undefined)
    this.editingId = c.id ?? null;
    this.form.patchValue({
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
    });
    this.previewUrl = c.photoUrl || null;
  }

  deleteContact(id?: number) {
    if (!id) {
      this.showToast('Cannot delete: invalid id');
      return;
    }
    this.service.delete(id).subscribe({
      next: () => {
        this.contacts = this.contacts.filter((c) => c.id !== id);
        this.showToast('Contact deleted!');
      },
      error: () => this.showToast('Error deleting contact'),
    });
  }

  get filteredContacts() {
    if (!this.searchTerm.trim()) return this.contacts;
    const term = this.searchTerm.toLowerCase();
    return this.contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.relationship.toLowerCase().includes(term) ||
        c.phone.includes(term)
    );
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (this.previewUrl = reader.result);
    reader.readAsDataURL(file);
  }

  openImage(url?: string) {
    if (url) this.modalImageUrl = url;
  }
  closeImage() {
    this.modalImageUrl = null;
  }

  resetForm() {
    this.form.reset();
    this.previewUrl = null;
    this.editingId = null;
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 2000);
  }
}
