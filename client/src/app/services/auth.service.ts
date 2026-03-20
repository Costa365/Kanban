import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

interface AuthResponse {
  token: string;
  email: string;
}

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

  register(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', { email, password }).pipe(
      tap((res) => this.setSession(res)),
    );
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

  logout(): void {
    this.token = null;
    this.email = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    this.router.navigate(['/login']);
  }
}
