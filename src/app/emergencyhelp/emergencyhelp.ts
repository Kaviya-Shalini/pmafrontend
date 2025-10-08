import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';

interface EmergencyContact {
  id: number;
  name: string;
  relationship: string;
  phone: string;
  photoUrl?: string;
  createdAt: Date;
}

@Component({
  selector: 'app-emergencyhelp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './emergencyhelp.html',
})
export class EmergencyHelpComponent {
  form: FormGroup;
  contacts: EmergencyContact[] = [];
  previewUrl: string | ArrayBuffer | null = null;
  editingId: number | null = null;
  searchTerm = '';
  toastVisible = false;
  toastMessage = '';
  modalImageUrl: string | null = null;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      relationship: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{8,15}$/)]],
      photo: [null],
    });
  }

  // === Add or Update Contact ===
  addOrUpdateContact() {
    if (this.form.invalid) return;

    if (this.editingId === null) {
      if (this.contacts.length >= 5) {
        this.showToast('You can only add up to 5 contacts!');
        return;
      }

      const newContact: EmergencyContact = {
        id: Date.now(),
        name: this.form.value.name,
        relationship: this.form.value.relationship,
        phone: this.form.value.phone,
        photoUrl: this.previewUrl as string,
        createdAt: new Date(),
      };
      this.contacts.push(newContact);
      this.showToast('Contact added successfully!');
    } else {
      const index = this.contacts.findIndex((c) => c.id === this.editingId);
      if (index > -1) {
        this.contacts[index] = {
          ...this.contacts[index],
          ...this.form.value,
          photoUrl: this.previewUrl as string,
        };
        this.showToast('Contact updated successfully!');
      }
    }

    this.resetForm();
  }

  // === Edit Contact ===
  editContact(c: EmergencyContact) {
    this.editingId = c.id;
    this.form.patchValue({
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
    });
    this.previewUrl = c.photoUrl || null;
  }

  // === Delete Contact ===
  deleteContact(id: number) {
    this.contacts = this.contacts.filter((c) => c.id !== id);
    this.showToast('Contact deleted!');
  }

  // === Search ===
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

  // === Handle Photo Upload ===
  onFileChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (this.previewUrl = reader.result);
    reader.readAsDataURL(file);
  }

  // === Image Modal ===
  openImage(url: string | undefined) {
    if (url) this.modalImageUrl = url;
  }

  closeImage() {
    this.modalImageUrl = null;
  }

  // === Reset Form ===
  resetForm() {
    this.form.reset();
    this.previewUrl = null;
    this.editingId = null;
  }

  // === Toast ===
  showToast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 2000);
  }
}
