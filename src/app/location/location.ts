// location.component.ts
import { Component, OnInit, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SafeUrlPipe } from './safe-url.pipe';

interface SavedLocation {
  latitude: number;
  longitude: number;
  address?: string;
  savedAt?: string;
}

@Component({
  selector: 'app-location',
  templateUrl: './location.html',
  styleUrls: ['./location.css'],
  imports: [FormsModule, ReactiveFormsModule, CommonModule, SafeUrlPipe],
  standalone: true,
})
export class LocationComponent implements OnInit {
  // Replace this with actual patient id from auth/user context
  patientId = 'patient-123';

  // current position
  currentLat: number | null = null;
  currentLng: number | null = null;
  currentAccuracy: number | null = null;

  // Permanent saved location
  permanentLocation: SavedLocation | null = null;

  // UI state
  loading = false;
  mapSrc = ''; // iframe src
  showSaveConfirm = false;
  editing = false;
  editAddress = '';
  editLat: number | null = null;
  editLng: number | null = null;

  // distance threshold in kilometers to consider "away" (customize as needed)
  awayThresholdKm = 0.2; // 200 meters

  // watch id
  private watchId: number | null = null;
  private periodicCheckSub: Subscription | null = null;
  isAway = false;

  // messages
  message = '';

  constructor(private http: HttpClient, private ngZone: NgZone) {}

  ngOnInit(): void {
    // ✅ dynamically load patientId from stored user info
    const username = localStorage.getItem('pma-username');
    const userId = localStorage.getItem('pma-userId');

    if (username && userId) {
      this.patientId = userId;
    } else {
      this.message = 'No user found. Please log in.';
      return;
    }

    this.loadPermanentLocation();
    this.getCurrentLocation();

    this.periodicCheckSub = interval(8000).subscribe(() => this.checkAwayStatus());
  }

  ngOnDestroy(): void {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.periodicCheckSub?.unsubscribe();
  }

  /*********************
   * Geolocation
   ********************/
  getCurrentLocation(): void {
    if (!('geolocation' in navigator)) {
      this.message = 'Geolocation is not supported by this browser.';
      return;
    }

    this.loading = true;
    // Use watchPosition to keep updating location
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.ngZone.run(() => {
          this.currentLat = pos.coords.latitude;
          this.currentLng = pos.coords.longitude;
          this.currentAccuracy = pos.coords.accuracy;
          this.updateMapIframe(this.currentLat!, this.currentLng!);
          this.loading = false;
          this.checkAwayStatus();
        });
      },
      (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.message = `Unable to get location: ${err.message}`;
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }

  updateMapIframe(lat: number, lng: number, zoom = 16): void {
    // OpenStreetMap embed - marker placed at lat,lng
    // We'll center map at lat/lng with a small bbox - the export/embed.html endpoint supports marker param
    // Use export/embed.html to keep it without API keys
    // Note: we set bbox to a small area around the coordinate so map centers nicely
    const delta = 0.0035; // small bbox range
    const left = lng - delta;
    const right = lng + delta;
    const top = lat + delta;
    const bottom = lat - delta;
    this.mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
  }

  /*********************
   * Permanent location (save / edit)
   ********************/
  loadPermanentLocation(): void {
    const url = `http://localhost:8080/api/patients/${this.patientId}/location`;
    this.http.get<SavedLocation>(url).subscribe({
      next: (loc) => {
        if (loc && loc.latitude && loc.longitude) {
          this.permanentLocation = { ...loc };
        }
      },
      error: () => {
        // Fallback: load from localStorage (demo mode)
        const stored = localStorage.getItem(`permLoc:${this.patientId}`);
        if (stored) {
          this.permanentLocation = JSON.parse(stored);
        }
      },
    });
  }

  askToSavePermanent(): void {
    if (this.currentLat == null || this.currentLng == null) {
      this.message = 'Current location not available yet.';
      return;
    }
    this.showSaveConfirm = true;
    this.editLat = this.currentLat;
    this.editLng = this.currentLng;
    this.editAddress = '';
  }

  async savePermanent(): Promise<void> {
    if (this.editLat == null || this.editLng == null) {
      this.message = 'No coordinates to save.';
      return;
    }

    const payload: SavedLocation = {
      latitude: this.editLat,
      longitude: this.editLng,
      address: this.editAddress || undefined,
      savedAt: new Date().toISOString(),
    };

    const url = `http://localhost:8080/api/patients/${this.patientId}/location`;

    // Try backend
    this.http.post(url, payload).subscribe({
      next: () => {
        this.permanentLocation = payload;
        localStorage.setItem(`permLoc:${this.patientId}`, JSON.stringify(payload));
        this.showSaveConfirm = false;
        this.message = 'Permanent location saved.';
      },
      error: () => {
        // fallback: localStorage for demo
        localStorage.setItem(`permLoc:${this.patientId}`, JSON.stringify(payload));
        this.permanentLocation = payload;
        this.showSaveConfirm = false;
        this.message = 'Permanent location saved locally (backend unreachable).';
      },
    });
  }

  startEditPermanent(): void {
    if (!this.permanentLocation) return;
    this.editing = true;
    this.editLat = this.permanentLocation.latitude;
    this.editLng = this.permanentLocation.longitude;
    this.editAddress = this.permanentLocation.address || '';
  }

  savePermanentEdit(): void {
    if (this.editLat == null || this.editLng == null) {
      this.message = 'Invalid coordinates.';
      return;
    }

    const payload: SavedLocation = {
      latitude: this.editLat,
      longitude: this.editLng,
      address: this.editAddress || undefined,
      savedAt: new Date().toISOString(),
    };

    const url = `http://localhost:8080/api/patients/${this.patientId}/location`;

    this.http.put(url, payload).subscribe({
      next: () => {
        this.permanentLocation = payload;
        localStorage.setItem(`permLoc:${this.patientId}`, JSON.stringify(payload));
        this.editing = false;
        this.message = 'Permanent location updated.';
      },
      error: () => {
        // fallback
        localStorage.setItem(`permLoc:${this.patientId}`, JSON.stringify(payload));
        this.permanentLocation = payload;
        this.editing = false;
        this.message = 'Permanent location updated locally (backend unreachable).';
      },
    });
  }

  cancelEdit(): void {
    this.editing = false;
    this.showSaveConfirm = false;
  }

  /*********************
   * Away detection & directions
   ********************/
  checkAwayStatus(): void {
    if (!this.permanentLocation || this.currentLat == null || this.currentLng == null) {
      this.isAway = false;
      return;
    }
    const dist = this.computeDistanceKm(
      this.currentLat,
      this.currentLng,
      this.permanentLocation.latitude,
      this.permanentLocation.longitude
    );
    this.isAway = dist > this.awayThresholdKm;
  }

  computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  getDirections(): void {
    if (!this.permanentLocation || this.currentLat == null || this.currentLng == null) {
      this.message = 'Cannot generate directions — missing coordinates.';
      return;
    }
    // Open Google Maps directions in a new tab (user-friendly)
    const sLat = this.currentLat;
    const sLng = this.currentLng;
    const dLat = this.permanentLocation.latitude;
    const dLng = this.permanentLocation.longitude;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${sLat},${sLng}&destination=${dLat},${dLng}&travelmode=walking`;
    window.open(url, '_blank');
  }

  /*********************
   * Danger alert
   ********************/
  sendDangerAlert(): void {
    // Create payload for backend
    const payload = {
      patientId: this.patientId,
      latitude: this.currentLat,
      longitude: this.currentLng,
      message: 'ALERT: Patient may be lost. Immediate help needed.',
      timestamp: new Date().toISOString(),
    };

    const url = `/api/alerts/danger`;
    this.http.post(url, payload).subscribe({
      next: () => {
        this.message = 'Danger alert sent to connected family members.';
      },
      error: () => {
        // fallback: simulate local alert and message
        this.message = 'Could not reach server to send alert. (Demo fallback: alert simulated)';
        // optionally send a Web Push via service worker in production
      },
    });
  }

  /*********************
   * Utilities for UI
   ********************/
  formatCoords(lat?: number | null, lng?: number | null): string {
    if (lat == null || lng == null) return '-';
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  showPermanentOnMap(): void {
    if (!this.permanentLocation) return;
    this.updateMapIframe(this.permanentLocation.latitude, this.permanentLocation.longitude, 15);
  }
}
