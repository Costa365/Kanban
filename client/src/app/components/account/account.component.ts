import { Component } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['../../account-forms.css', './account.component.css'],
  standalone: false,
})
export class AccountComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  closurePassword = '';
  confirmation = '';
  acknowledged = false;
  busy: 'password' | 'closure' | null = null;
  passwordError = '';
  passwordMessage = '';
  closureError = '';

  constructor(public auth: AuthService) {}

  changePassword(): void {
    if (this.busy) return;
    this.passwordError = '';
    this.passwordMessage = '';
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Passwords do not match.';
      return;
    }
    if (this.newPassword.length < 8 || new TextEncoder().encode(this.newPassword).length > 72) {
      this.passwordError = 'Use at least 8 characters and at most 72 UTF-8 bytes.';
      return;
    }
    this.busy = 'password';
    this.auth.changePassword(this.currentPassword, this.newPassword).pipe(finalize(() => (this.busy = null))).subscribe({
      next: (response) => {
        this.passwordMessage = response.message;
        this.currentPassword = this.newPassword = this.confirmPassword = '';
      },
      error: (err) => { this.passwordError = err.error?.error || 'Unable to connect. Please try again.'; },
    });
  }

  closeAccount(): void {
    if (this.busy || !this.acknowledged || this.confirmation !== 'DELETE') return;
    this.closureError = '';
    this.busy = 'closure';
    this.auth.closeAccount(this.closurePassword, this.confirmation).pipe(finalize(() => (this.busy = null))).subscribe({
      next: () => this.auth.logout('account-closed'),
      error: (err) => { this.closureError = err.error?.error || 'Unable to close account. Please try again.'; },
    });
  }
}
