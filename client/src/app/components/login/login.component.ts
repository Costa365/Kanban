import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false,
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  isRegister = false;

  constructor(private authService: AuthService, private router: Router) {}

  submit(): void {
    this.error = '';
    const action = this.isRegister
      ? this.authService.register(this.email, this.password)
      : this.authService.login(this.email, this.password);

    action.subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error = err.error?.error || 'Something went wrong';
      },
    });
  }

  toggleMode(): void {
    this.isRegister = !this.isRegister;
    this.error = '';
  }
}
