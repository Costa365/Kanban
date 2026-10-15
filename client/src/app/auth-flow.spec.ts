import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { Location } from '@angular/common';
import { AppModule } from './app.module';
import { LoginComponent } from './components/login/login.component';
import { AuthService } from './services/auth.service';

describe('Account routes with real templates', () => {
  let http: HttpTestingController;
  beforeEach(async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    await TestBed.configureTestingModule({
      imports: [AppModule],
      providers: [provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.inject(AuthService).clearSession(); });

  it('shows the public homepage without requiring a session or loading private tasks', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Location).path()).toBe('');
    expect(harness.routeNativeElement?.textContent).toContain('Your work, in clear view.');
    expect(harness.routeNativeElement?.querySelector('img[src="assets/board-preview.png"]')).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('a[href="/signup"]')).toBeTruthy();
    http.expectNone('/api/tasks');
  });

  it('still requires sign-in to open the private board', async () => {
    const harness = await RouterTestingHarness.create('/board');
    expect(TestBed.inject(Location).path()).toBe('/login');
    expect(harness.routeNativeElement?.textContent).toContain('Sign in to Kanban');
    http.expectNone('/api/tasks');
  });

  it('opens the board when a signed-in user visits the homepage', async () => {
    TestBed.inject(AuthService).login('person@example.test', 'chosen password').subscribe();
    http.expectOne('/api/auth/login').flush({ token: 'session-token', email: 'person@example.test' });
    const harness = await RouterTestingHarness.create('/');
    http.expectOne('/api/tasks').flush([]);
    harness.detectChanges();
    expect(TestBed.inject(Location).path()).toBe('/board');
    expect(harness.routeNativeElement?.querySelector('.board')).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('.board-preview')).toBeNull();
  });

  it('redirects old About links to the public homepage', async () => {
    const harness = await RouterTestingHarness.create('/about');
    expect(TestBed.inject(Location).path()).toBe('');
    expect(harness.routeNativeElement?.textContent).toContain('Your work, in clear view.');
    http.expectNone('/api/tasks');
  });

  it('loads a verification email fragment, removes it from the URL, and confirms using the real form', async () => {
    const token = 'a'.repeat(64);
    const harness = await RouterTestingHarness.create('/verify-email#token=' + token);
    expect(harness.routeNativeElement?.textContent).toContain('Verify your email');
    expect(TestBed.inject(Location).path(true)).not.toContain(token);
    const form = harness.routeNativeElement!.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne('/api/auth/verify-email');
    expect(request.request.body).toEqual({ token });
    request.flush({ message: 'Your email is verified. You can now sign in.' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Your email is verified');
    expect(harness.routeNativeElement!.querySelector('form')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('a[href="/login"]')).toBeTruthy();
  });

  it('shows confirmation fields and waits for email verification after submitting signup', async () => {
    const harness = await RouterTestingHarness.create('/signup');
    const component = await harness.navigateByUrl('/signup', LoginComponent);
    component.email = 'person@example.test';
    component.password = component.confirmPassword = 'chosen password';
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelectorAll('input[type="password"]').length).toBe(2);
    harness.routeNativeElement!.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http.expectOne('/api/auth/register').flush({ message: 'Check your inbox for a verification link.' }, { status: 202, statusText: 'Accepted' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Check your inbox');
    expect(TestBed.inject(AuthService).isLoggedIn()).toBeFalse();
    expect(harness.routeNativeElement!.querySelector('a[href^="/resend-verification"]')).toBeTruthy();
  });
});
