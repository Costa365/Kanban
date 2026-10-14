import { Component, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, finalize } from 'rxjs';
import { AccountMessage, AuthService } from '../../services/auth.service';

type Mode = 'login' | 'signup' | 'forgot' | 'resend' | 'verify' | 'reset';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['../../account-forms.css'],
  standalone: false,
})
export class LoginComponent implements OnInit, OnDestroy {
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  message = '';
  mode: Mode = 'login';
  loading = false;
  completed = false;
  private token = '';
  private subscriptions = new Subscription();

  constructor(private authService: AuthService, private router: Router,
    private route: ActivatedRoute, private location: Location) {}

  ngOnInit(): void {
    this.subscriptions.add(this.route.data.subscribe((data) => {
      this.mode = data['mode'] || 'login';
      this.email = this.route.snapshot.queryParamMap.get('email') || this.email;
      this.password = '';
      this.confirmPassword = '';
      this.error = '';
      this.message = '';
      this.completed = false;
      this.token = new URLSearchParams(this.route.snapshot.fragment || '').get('token') || '';
      if (this.mode === 'verify' || this.mode === 'reset') {
        // Keep the token only in memory after reading the email link.
        this.location.replaceState(this.router.url.split('#')[0]);
        if (!/^[a-f0-9]{64}$/.test(this.token)) {
          this.error = 'This link is missing or invalid. Request a new email below.';
        }
      }
      if (this.route.snapshot.queryParamMap.get('notice') === 'account-closed') {
        this.message = 'Your account and all its tasks have been permanently deleted.';
      }
    }));
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

  get title(): string {
    return {
      login: 'Sign in to Kanban', signup: 'Create an account', forgot: 'Forgot password?',
      resend: 'Resend verification', verify: 'Verify your email', reset: 'Reset your password',
    }[this.mode];
  }
  get description(): string {
    return {
      login: 'Your board is waiting for you.',
      signup: 'We’ll email you a link to complete your signup.',
      forgot: 'Enter your account email to receive a password reset link.',
      resend: 'Enter your email for a new verification link. Allow at least a minute between requests.',
      verify: 'Confirm your email to finish creating your account.',
      reset: 'Choose a new password for your account.',
    }[this.mode];
  }
  get needsEmail(): boolean { return ['login', 'signup', 'forgot', 'resend'].includes(this.mode); }
  get needsPassword(): boolean { return ['login', 'signup', 'reset'].includes(this.mode); }
  get needsConfirmation(): boolean { return this.mode === 'signup' || this.mode === 'reset'; }
  get invalidLink(): boolean {
    return (this.mode === 'verify' || this.mode === 'reset') && !/^[a-f0-9]{64}$/.test(this.token);
  }
  get buttonText(): string {
    if (this.loading) return 'Please wait…';
    return {
      login: 'Sign in', signup: 'Create account', forgot: 'Send reset link',
      resend: 'Send verification link', verify: 'Verify email', reset: 'Save new password',
    }[this.mode];
  }

  submit(): void {
    if (this.loading || this.invalidLink || this.completed) return;
    this.error = '';
    this.message = '';
    if (this.needsConfirmation && this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    if (this.needsConfirmation && (this.password.length < 8 || new TextEncoder().encode(this.password).length > 72)) {
      this.error = 'Use at least 8 characters and at most 72 UTF-8 bytes.';
      return;
    }
    this.loading = true;
    let action: Observable<AccountMessage | { token: string; email: string }>;
    switch (this.mode) {
      case 'signup': action = this.authService.register(this.email, this.password); break;
      case 'forgot': action = this.authService.forgotPassword(this.email); break;
      case 'resend': action = this.authService.resendVerification(this.email); break;
      case 'verify': action = this.authService.verifyEmail(this.token); break;
      case 'reset': action = this.authService.resetPassword(this.token, this.password); break;
      default: action = this.authService.login(this.email, this.password);
    }
    this.subscriptions.add(action.pipe(finalize(() => (this.loading = false))).subscribe({
      next: (response) => {
        if (this.mode === 'login') {
          this.router.navigate(['/']);
          return;
        }
        if ('message' in response) this.message = response.message;
        this.completed = ['signup', 'verify', 'reset'].includes(this.mode);
        this.password = '';
        this.confirmPassword = '';
        if (this.mode === 'reset') this.authService.clearSession();
      },
      error: (err) => { this.error = err.error?.error || 'Unable to connect. Please try again.'; },
    }));
  }
}
