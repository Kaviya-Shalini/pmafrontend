import { Component, ElementRef, HostListener, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-add-memory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './add-memory.html',
  styleUrls: [],
})
export class AddMemoryComponent implements OnInit {
  askingPatient = true;
  isAlzheimer = false;
  showForm = false;

  quickQuestion = '';
  infoMessage = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  form!: FormGroup;

  chosenFile: File | null = null;
  voiceBlob: Blob | null = null;

  recording = false;
  mediaRecorder: any = null;
  chunks: any[] = [];
  audioURL: string | null = null;

  // Dropdown
  dropdownOpen = false;
  selectedCategory = '';
  categories = [
    { value: 'government_id', label: 'Government ID' },
    { value: 'marksheet', label: 'Marksheet' },
    { value: 'important_dates', label: 'Important Dates' },
    { value: 'notes', label: 'Notes' },
    { value: 'password', label: 'Password' },
    { value: 'medication', label: 'Medication' },
    { value: 'other', label: 'Other' },
  ];

  // Calendar
  calendarOpen = false;
  selectedDate: Date | null = null;
  tempDate = '';
  tempTime = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
    private eRef: ElementRef
  ) {
    this.form = this.fb.group({
      userId: ['user-123', Validators.required],
      title: ['', Validators.required],
      category: ['notes', Validators.required],
      customCategory: [''],
      description: [''],
      file: [null],
      reminderAt: [''],
      reminderDaily: [false],
      medicationName: [''],
      dosage: [''],
      storageLocation: [''],
    });
  }

  ngOnInit() {}

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    const clickedInside = this.eRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.calendarOpen = false;
      this.dropdownOpen = false;
    }
  }

  answerPatient(answer: boolean) {
    this.askingPatient = false;
    this.isAlzheimer = answer;
    const payload = { userId: this.form.value.userId ?? 'user-123', isAlzheimer: answer };

    this.http
      .post<{ success: boolean; message?: string }>(
        'http://localhost:8080/api/patient-status',
        payload
      )
      .subscribe({
        next: () => {
          this.infoMessage = answer
            ? `Thanks. We recorded that you are an Alzheimer’s patient.`
            : `Thanks for letting us know. You can still add memories.`;
          setTimeout(() => (this.showForm = true), 800);
        },
        error: () => {
          this.infoMessage = `Saved locally — you can continue adding memories.`;
          setTimeout(() => (this.showForm = true), 600);
        },
      });
  }

  selectCategory(option: any) {
    this.selectedCategory = option.label;
    this.form.patchValue({ category: option.value });
    this.dropdownOpen = false;
  }

  onDateChange(event: any) {
    this.tempDate = event.target.value;
  }
  onTimeChange(event: any) {
    this.tempTime = event.target.value;
  }
  applyDate() {
    if (this.tempDate && this.tempTime) {
      this.selectedDate = new Date(`${this.tempDate}T${this.tempTime}`);
      this.form.patchValue({ reminderAt: this.selectedDate.toISOString() });
      this.calendarOpen = false;
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files?.[0];
    if (file) {
      this.chosenFile = file;
      this.form.patchValue({ file: file.name });
    }
  }

  onVoiceNoteSelected(event: any) {
    const file: File = event.target.files?.[0];
    if (file) {
      this.voiceBlob = file;
      this.audioURL = URL.createObjectURL(file);
    }
  }

  deleteVoiceNote() {
    this.voiceBlob = null;
    this.audioURL = null;
  }

  async startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMessage = 'Recording not supported in this browser.';
      return;
    }

    try {
      if (this.voiceBlob || this.audioURL) this.deleteVoiceNote();
      this.chunks = [];
      this.successMessage = '';
      this.errorMessage = '';

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new (window as any).MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const finalBlob = new Blob(this.chunks, { type: 'audio/webm' });
        this.ngZone.run(() => {
          this.voiceBlob = finalBlob;
          this.audioURL = URL.createObjectURL(finalBlob);
        });
      };

      this.mediaRecorder.start();
      this.recording = true;
      this.ngZone.run(() => {
        this.successMessage = '🎙 Recording started...';
        this.errorMessage = '';
      });
    } catch {
      this.errorMessage = 'Microphone access denied or unavailable.';
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.recording) {
      this.mediaRecorder.stop();
      this.recording = false;
      this.ngZone.run(() => {
        this.successMessage = '⏹ Recording stopped. Preview enabled 👇';
      });
    }
  }

  submit() {
    if (this.form.invalid) {
      this.errorMessage = 'Please fill required fields (title & category).';
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const values = this.form.value;
    const fd = new FormData();

    fd.append('userId', values.userId ?? '');
    fd.append('title', values.title ?? '');
    fd.append('category', values.category ?? '');
    if (values.category === 'other' && values.customCategory)
      fd.append('customCategory', values.customCategory);
    fd.append('description', values.description ?? '');
    if (this.chosenFile) fd.append('file', this.chosenFile, this.chosenFile.name);
    if (this.voiceBlob) fd.append('voiceNote', this.voiceBlob, `voice-${Date.now()}.webm`);

    if (values.reminderAt) fd.append('reminderAt', values.reminderAt);
    fd.append('reminderDaily', String(values.reminderDaily ?? false));

    if (values.category === 'medication') {
      fd.append('medicationName', values.medicationName ?? '');
      fd.append('dosage', values.dosage ?? '');
      fd.append('storageLocation', values.storageLocation ?? '');
    }

    fd.append('isAlzheimer', String(this.isAlzheimer));

    this.http
      .post<{ success: boolean; message?: string }>('http://localhost:8080/api/memories', fd)
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success) {
            this.successMessage = res.message || 'Memory uploaded successfully!';
            const uid = this.form.value.userId;
            this.form.reset({ userId: uid, category: 'notes' });
            this.chosenFile = null;
            this.voiceBlob = null;
            this.selectedCategory = '';
          } else {
            this.errorMessage = res.message || 'Upload failed.';
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Server error. Try again later.';
        },
      });
  }
}
