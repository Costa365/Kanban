import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

interface AuthResponse {
  token: string;
  email: string;
}

export interface AccountMessage { message: string; }

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private token: string | null = null;
  private email: string | null = null;

  constructor(private http: HttpClient, private router: Router) {
    this.token = localStorage.getItem('auth_token');
    this.email = localStorage.getItem('auth_email');
  }

  register(email: string, password: string): Observable<AccountMessage> {
    return this.http.post<AccountMessage>('/api/auth/register', { email, password });
  }

  resendVerification(email: string): Observable<AccountMessage> {
    return this.http.post<AccountMessage>('/api/auth/resend-verification', { email });
  }

  verifyEmail(token: string): Observable<AccountMessage> {
    return this.http.post<AccountMessage>('/api/auth/verify-email', { token });
  }

  forgotPassword(email: string): Observable<AccountMessage> {
    return this.http.post<AccountMessage>('/api/auth/forgot-password', { email });
  }

  resetPassword(token: string, password: string): Observable<AccountMessage> {
    return this.http.post<AccountMessage>('/api/auth/reset-password', { token, password });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<AuthResponse & AccountMessage> {
    return this.http.post<AuthResponse & AccountMessage>('/api/auth/change-password', { currentPassword, newPassword }).pipe(
      tap((res) => this.setSession(res)),
    );
  }

  closeAccount(password: string, confirmation: string): Observable<AccountMessage> {
    return this.http.delete<AccountMessage>('/api/auth/account', { body: { password, confirmation } });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap((res) => this.setSession(res)),
    );
  }

  private setSession(res: AuthResponse): void {
    this.token = res.token;
    this.email = res.email;
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_email', res.email);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  getEmail(): string | null {
    return this.email;
  }

  clearSession(): void {
    this.token = null;
    this.email = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
  }

  logout(notice?: 'account-closed'): void {
    this.clearSession();
    this.router.navigate(['/login'], { queryParams: notice ? { notice } : {} });
  }
}
