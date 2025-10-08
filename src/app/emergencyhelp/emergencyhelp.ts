import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { EmergencyHelpService, EmergencyContact } from './EmergencyHelp.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-emergency-help',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './emergencyhelp.html',
  styleUrls: ['./emergencyhelp.css'],
})
export class EmergencyHelpComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  form: FormGroup;
  previewUrl: string | null = null;
  editingId: string | null = null;
  uploading = false;
  toastMessage = '';
  toastVisible = false;

  contacts$ = new BehaviorSubject<EmergencyContact[]>([]);
  total = 0;
  page = 0;
  size = 10;
  searchTerm = '';

  constructor(private fb: FormBuilder, private svc: EmergencyHelpService) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(60)]],
      relation: ['', [Validators.required, Validators.maxLength(30)]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{6,20}$/)]],
      photo: [null],
    });
  }

  ngOnInit() {
    this.loadContacts();
  }

  onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) {
      this.previewUrl = null;
      this.form.patchValue({ photo: null });
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      this.fileInput.nativeElement.value = '';
      return;
    }
    this.form.patchValue({ photo: file });
    const reader = new FileReader();
    reader.onload = (ev) => (this.previewUrl = ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  loadContacts(page = this.page) {
    this.svc.getContacts(page, this.size, this.searchTerm).subscribe({
      next: (res) => {
        res.items.forEach((c) => {
          if (c.photoUrl && !c.photoUrl.startsWith('http'))
            c.photoUrl = `http://localhost:8080${c.photoUrl}`;
        });
        this.contacts$.next(res.items);
        this.total = res.total;
      },
    });
  }

  addOrUpdateContact() {
    if (this.form.invalid) return;

    // ✅ Limit: Only 5 contacts
    if (!this.editingId && this.total >= 5) {
      this.showToast('Maximum 5 emergency contacts allowed 🚨');
      return;
    }

    const fd = new FormData();
    fd.append('name', this.form.value.name.trim());
    fd.append('relation', this.form.value.relation.trim());
    fd.append('phone', this.form.value.phone.trim());
    if (this.form.value.photo) fd.append('photo', this.form.value.photo);

    this.uploading = true;

    if (this.editingId) {
      this.svc.updateContact(this.editingId, fd).subscribe({
        next: () => {
          this.showToast('Contact updated successfully ✅');
          this.resetForm();
          this.loadContacts();
        },
        error: () => this.showToast('Failed to update ❌'),
        complete: () => (this.uploading = false),
      });
    } else {
      this.svc.addContact(fd).subscribe({
        next: () => {
          this.showToast('Emergency contact added ✅');
          this.resetForm();
          this.loadContacts();
        },
        error: () => this.showToast('Failed to add ❌'),
        complete: () => (this.uploading = false),
      });
    }
  }

  editContact(c: EmergencyContact) {
    this.editingId = c.id;
    this.form.patchValue({
      name: c.name,
      relation: c.relation,
      phone: c.phone,
    });
    this.previewUrl = c.photoUrl || null;
    this.showToast(`Editing ${c.name}`);
  }

  deleteContact(id: string) {
    if (confirm('Are you sure you want to delete this emergency contact?')) {
      this.svc.deleteContact(id).subscribe({
        next: () => {
          this.showToast('Deleted successfully!');
          this.loadContacts();
        },
        error: () => this.showToast('Failed to delete ❌'),
      });
    }
  }

  resetForm() {
    this.form.reset();
    this.previewUrl = null;
    this.editingId = null;
    this.fileInput.nativeElement.value = '';
  }

  onSearch() {
    this.loadContacts(0);
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 3000);
  }
}
