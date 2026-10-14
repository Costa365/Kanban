import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); auth.clearSession(); });

  it('does not establish a session on registration', () => {
    auth.register('person@example.test', 'password').subscribe();
    http.expectOne('/api/auth/register').flush({ message: 'Check your email.' });
    expect(auth.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('replaces the session after password change', () => {
    auth.changePassword('old password', 'new password').subscribe();
    http.expectOne('/api/auth/change-password').flush({ token: 'new-session', email: 'person@example.test', message: 'Changed.' });
    expect(auth.getToken()).toBe('new-session');
    expect(localStorage.getItem('auth_token')).toBe('new-session');
  });

  it('sends password and deletion confirmation in the DELETE body', () => {
    auth.closeAccount('password', 'DELETE').subscribe();
    const request = http.expectOne('/api/auth/account');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ password: 'password', confirmation: 'DELETE' });
    request.flush({ message: 'Deleted.' });
  });
});
