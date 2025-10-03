import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcomepma',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcomepage.html',
  styleUrls: ['./welcomepage.css'],
})
export class WelcomepmaComponent {
  constructor(private router: Router) {}

  goToAuth() {
    this.router.navigate(['/auth']);
  }
}
