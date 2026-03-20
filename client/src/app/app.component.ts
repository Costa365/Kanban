import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false,
})
export class AppComponent implements OnInit {
  theme: 'light' | 'dark' = 'light';

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      this.theme = stored;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.theme = 'dark';
    }
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  toggleTheme(): void {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', this.theme);
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  logout(): void {
    this.authService.logout();
  }
}
