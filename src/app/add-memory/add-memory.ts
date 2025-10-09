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

  infoMessage = '';
  loading = false;
  successMessage = '';
  errorMessage = '';
  recordingStatusMessage = '';

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

  fileStatus: string = '';
  fileSuccess: boolean = false;
  memories: any[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
    private eRef: ElementRef
  ) {
    const userId = localStorage.getItem('pma-userId');

    this.form = this.fb.group({
      userId: [userId, Validators.required],
      title: ['', Validators.required],
      category: ['', Validators.required],
      customCategory: [''],
      description: ['', Validators.required],
      file: [null],
      reminderAt: [''],
      reminderDaily: [false],
      medicationName: [''],
      dosage: [''],
      storageLocation: [''],
    });

    if (!userId) {
      this.router.navigate(['/auth']);
    }
  }

  ngOnInit() {
    // The logic here remains the same, but now it's reading a reliable flag
    const answered = localStorage.getItem('pma-quickQuestionAnswered');
    if (answered === 'true') {
      this.askingPatient = false;
      this.showForm = true;
      this.loadMemories();
    }
  }
  loadMemories() {
    const userId = this.form.value.userId;

    if (!userId) {
      console.warn('User ID missing. Cannot load memories.');
      return;
    }

    this.http.get<any[]>(`http://localhost:8080/api/memories/${userId}`).subscribe({
      next: (data) => {
        console.log('Loaded memories:', data);
        // You can store them in a variable to show in the template if needed
        this.memories = data;
      },
      error: (err) => {
        console.error('Error loading memories:', err);
      },
    });
  }

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

    const payload = { userId: this.form.value.userId, isAlzheimer: answer };

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

    if (!file) {
      this.fileStatus = '';
      this.fileSuccess = false;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.fileStatus = `❌ Error: File too large (max 5MB).`;
      this.fileSuccess = false;
      this.chosenFile = null;
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.fileStatus = `❌ Error: Invalid file type.`;
      this.fileSuccess = false;
      this.chosenFile = null;
      return;
    }

    this.chosenFile = file;
    this.fileStatus = `✅ File added successfully: ${file.name}`;
    this.fileSuccess = true;
    this.form.patchValue({ file: file.name });
  }

  removeFile() {
    this.chosenFile = null;
    this.fileStatus = '';
    this.fileSuccess = false;
    this.form.patchValue({ file: null });
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
    this.recordingStatusMessage = '';
  }

  async startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.recordingStatusMessage = 'Recording not supported in this browser.';
      return;
    }

    try {
      if (this.voiceBlob || this.audioURL) this.deleteVoiceNote();
      this.chunks = [];
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
        this.recordingStatusMessage = '🎙 Recording started...';
      });
    } catch {
      this.recordingStatusMessage = 'Microphone access denied or unavailable.';
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.recording) {
      this.mediaRecorder.stop();
      this.recording = false;
      this.ngZone.run(() => {
        this.recordingStatusMessage = '⏹ Recording stopped. Preview enabled 👇';
      });
    }
  }
  logout() {
    // Clear all user-specific data from localStorage
    localStorage.removeItem('pma-userId');
    localStorage.removeItem('pma-quickQuestionAnswered');

    // Redirect to the authentication page
    this.router.navigate(['/auth']);
  }
  submit() {
    if (this.form.invalid) {
      this.errorMessage = 'Please fill all required fields (title, category, and description).';
      setTimeout(() => {
        this.errorMessage = '';
      }, 4000);
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

    this.http
      .post<{ success: boolean; message?: string }>('http://localhost:8080/api/memories', fd)
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res.success) {
            this.successMessage = res.message || 'Memory uploaded successfully!';
            const uid = this.form.value.userId;
            this.form.reset({ userId: uid, category: '' });
            this.chosenFile = null;
            this.voiceBlob = null;
            this.selectedCategory = '';
            this.selectedDate = null;
            this.audioURL = null;
            this.recordingStatusMessage = '';
            setTimeout(() => {
              this.successMessage = '';
            }, 4000);
          } else {
            this.errorMessage = res.message || 'Upload failed.';
            setTimeout(() => {
              this.errorMessage = '';
            }, 4000);
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Server error. Try again later.';
          setTimeout(() => {
            this.errorMessage = '';
          }, 4000);
        },
      });
  }
}
