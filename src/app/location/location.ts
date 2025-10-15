import { Component, OnInit, NgZone } from '@angular/core';
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
export class LocationComponent implements OnInit {
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
  private periodicCheckSub: Subscription | null = null;
  private readonly awayThresholdKm = 0.2;

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
      this.loadPermanentLocation();
      this.startWatchingPosition();
      this.periodicCheckSub = interval(8000).subscribe(() => this.checkAwayStatus());
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
    this.loading = true;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.ngZone.run(() => {
          this.currentLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          this.currentAccuracy = pos.coords.accuracy;
          this.updateMapIframe(this.currentLocation.latitude, this.currentLocation.longitude);
          this.loading = false;
          this.checkAwayStatus();
        });
      },
      () =>
        this.ngZone.run(() => {
          this.loading = false;
          this.message = 'Unable to get location.';
        }),
      { enableHighAccuracy: true }
    );
  }

  updateMapIframe(lat: number, lng: number): void {
    const delta = 0.0035;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    this.mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  }

  loadPermanentLocation(): void {
    this.http
      .get<Location>(`http://localhost:8080/api/patients/${this.patientId}/location`)
      .subscribe({
        next: (loc) => {
          if (loc) this.permanentLocation = loc;
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

    const request = this.editing
      ? this.http.put<Location>(
          `http://localhost:8080/api/patients/${this.patientId}/location`,
          payload
        )
      : this.http.post<Location>(
          `http://localhost:8080/api/patients/${this.patientId}/location`,
          payload
        );

    request.subscribe({
      next: (savedLocation) => {
        this.permanentLocation = savedLocation;
        this.editing = false;
        this.showSaveConfirm = false;
        this.toastr.success(`Permanent location ${this.editing ? 'updated' : 'saved'}!`);
      },
      error: () => this.toastr.error('Failed to save location.'),
    });
  }

  cancelEdit(): void {
    this.editing = false;
    this.showSaveConfirm = false;
  }

  checkAwayStatus(): void {
    if (!this.permanentLocation || !this.currentLocation) return;
    const dist = this.computeDistanceKm(
      this.currentLocation.latitude,
      this.currentLocation.longitude,
      this.permanentLocation.latitude,
      this.permanentLocation.longitude
    );
    this.isAway = dist > this.awayThresholdKm;
  }

  computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  getDirections(): void {
    if (!this.permanentLocation || !this.currentLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${this.currentLocation.latitude},${this.currentLocation.longitude}&destination=${this.permanentLocation.latitude},${this.permanentLocation.longitude}&travelmode=walking`;
    window.open(url, '_blank');
  }

  /**
   * Triggers a danger alert.
   * This now subscribes to the alert service, which is required to send the HTTP request.
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
