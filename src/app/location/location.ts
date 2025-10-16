import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SafeUrlPipe } from './safe-url.pipe';
import { ToastrService } from 'ngx-toastr';
import { AlertService } from './alert.service';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  savedAt?: string;
  isPermanent?: boolean;
}

@Component({
  selector: 'app-location',
  templateUrl: './location.html',
  styleUrls: ['./location.css'],
  imports: [FormsModule, CommonModule, SafeUrlPipe],
  standalone: true,
})
export class LocationComponent implements OnInit, OnDestroy {
  patientId = '';
  currentLocation: Location | null = null;
  permanentLocation: Location | null = null;
  currentAccuracy: number | null = null;
  loading = false;
  mapSrc = '';
  showSaveConfirm = false;
  editing = false;
  editAddress = '';
  editLat: number | null = null;
  editLng: number | null = null;
  isAway = false;
  message = '';
  private watchId: number | null = null;
  private periodicCheckSub: Subscription | null = null; // Removed: private readonly awayThresholdKm = 0.2; // This logic is now handled by the backend (50m radius)
  constructor(
    private alertService: AlertService,
    private http: HttpClient,
    private ngZone: NgZone,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const userId = localStorage.getItem('pma-userId');
    if (userId) {
      this.patientId = userId;
      // loadPermanentLocation() is now called AFTER we get the first location fix.
      this.startWatchingPosition();
      // Use the new status check function
      this.periodicCheckSub = interval(8000).subscribe(() => this.getSafetyStatus());
    } else {
      this.message = 'No user found. Please log in.';
    }
  }

  ngOnDestroy(): void {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.periodicCheckSub?.unsubscribe();
  }

  startWatchingPosition(): void {
    if (!('geolocation' in navigator)) return;

    this.loading = true; // We no longer need the firstPositionLoaded flag.
    // We update the map on every successful watch position.

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.ngZone.run(() => {
          this.currentLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          this.currentAccuracy = pos.coords.accuracy;
          this.loading = false; // ✅ Fix 1: Always update the map to current location upon receiving a new position

          this.updateMapIframe(this.currentLocation.latitude, this.currentLocation.longitude);

          // ✅ Fix 2: Load permanent location and run initial safety check after the first valid location fix.
          // We check if permanentLocation is null to avoid unnecessary calls.
          if (!this.permanentLocation) {
            this.loadPermanentLocation();
          } // ✅ Trigger the check immediately after location is updated

          this.getSafetyStatus();
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.message = 'Unable to get current location. Please allow permission.';
          console.error('Geolocation error:', error);
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }

  updateMapIframe(lat: number, lng: number): void {
    const delta = 0.0035;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    this.mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  }

  loadPermanentLocation(): void {
    this.http
      // Updated API path to match the new controller structure
      .get<Location>(`http://localhost:8080/api/locations/patients/${this.patientId}/permanent`)
      .subscribe({
        next: (loc) => {
          if (loc) {
            this.permanentLocation = loc;
            this.getSafetyStatus(); // Check safety immediately after loading permanent location
          }
        },
        error: () => this.toastr.info('No permanent location set yet.'),
      });
  }

  askToSavePermanent(): void {
    if (!this.currentLocation) {
      this.toastr.warning('Current location not available yet.');
      return;
    }
    this.showSaveConfirm = true;
    this.editing = false;
    this.editLat = this.currentLocation.latitude;
    this.editLng = this.currentLocation.longitude;
    this.editAddress = '';
  }

  startEditPermanent(): void {
    if (!this.permanentLocation) return;
    this.editing = true;
    this.showSaveConfirm = true;
    this.editLat = this.permanentLocation.latitude;
    this.editLng = this.permanentLocation.longitude;
    this.editAddress = this.permanentLocation.address || '';
  }

  saveOrUpdatePermanent(): void {
    if (this.editLat === null || this.editLng === null) return;
    const payload: Location = {
      latitude: this.editLat,
      longitude: this.editLng,
      address: this.editAddress,
      isPermanent: true,
    };

    const url = `http://localhost:8080/api/locations/patients/${this.patientId}/permanent`;

    const request = this.editing
      ? this.http.put<Location>(url, payload)
      : this.http.post<Location>(url, payload);

    request.subscribe({
      next: (savedLocation) => {
        this.permanentLocation = savedLocation;
        this.editing = false;
        this.showSaveConfirm = false;
        this.getSafetyStatus(); // Re-check status after saving a new permanent location
        this.toastr.success(`Permanent location ${this.editing ? 'updated' : 'saved'}!`);
      },
      error: () => this.toastr.error('Failed to save location.'),
    });
  }

  cancelEdit(): void {
    this.editing = false;
    this.showSaveConfirm = false;
  }

  /**
   * NEW: Fetches the definitive safety status from the backend.
   * This replaces the unreliable client-side distance check.
   */
  getSafetyStatus(): void {
    if (!this.permanentLocation || !this.currentLocation) {
      // Cannot check status if we don't know both locations
      this.isAway = false;
      return;
    }

    const currentLoc = {
      patientId: this.patientId,
      latitude: this.currentLocation.latitude,
      longitude: this.currentLocation.longitude,
    };

    // Call the new backend API endpoint
    this.http
      .post<boolean>(`http://localhost:8080/api/locations/safety/check`, currentLoc)
      .subscribe({
        next: (isSafe: boolean) => {
          // If the backend says it's SAFE (true), then we are NOT away (isAway = false).
          this.isAway = !isSafe;

          // Optionally provide a status message
          this.message = this.isAway
            ? 'Warning: Away from permanent location.'
            : 'Status: Safe at permanent location.';
        },
        error: (err) => {
          this.isAway = false; // Default to safe if check fails
          this.message = 'Error checking safety status.';
          console.error('Failed to get safety status:', err);
        },
      });
  } // REMOVED: checkAwayStatus() and computeDistanceKm() are no longer needed,

  // as the backend handles the definitive distance calculation.
  // checkAwayStatus(): void { ... }
  // computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number { ... }

  getDirections(): void {
    if (!this.permanentLocation || !this.currentLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${this.currentLocation.latitude},${this.currentLocation.longitude}&destination=${this.permanentLocation.latitude},${this.permanentLocation.longitude}&travelmode=walking`;
    window.open(url, '_blank');
  }
  /**
   * Triggers a danger alert.
   */

  sendDangerAlert(): void {
    if (!this.currentLocation) {
      this.toastr.warning('Current location not available.');
      return;
    }

    const alertData = {
      patientId: this.patientId,
      latitude: this.currentLocation.latitude,
      longitude: this.currentLocation.longitude,
      message: '⚠️ ALERT: Patient may be lost or in danger!',
      patientName: localStorage.getItem('pma-username'),
    };

    this.alertService.sendAlert(alertData).subscribe({
      next: () => {
        this.toastr.success('Danger alert sent to family members!');
      },
      error: (err) => {
        console.error('Failed to send danger alert:', err);
        this.toastr.error('Could not send alert. Please try again.');
      },
    });
  }

  formatCoords(lat?: number | null, lng?: number | null): string {
    if (lat == null || lng == null) return '...';
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  showPermanentOnMap(): void {
    if (!this.permanentLocation) return;
    this.updateMapIframe(this.permanentLocation.latitude, this.permanentLocation.longitude);
  }
}
