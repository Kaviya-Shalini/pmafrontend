import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-welcomepma',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './welcomepage.html',
  styleUrls: ['./welcomepage.css'],
})
export class WelcomepmaComponent {
  constructor(private router: Router) {}

  goToAuth() {
    this.router.navigate(['/auth']);
  }
}
