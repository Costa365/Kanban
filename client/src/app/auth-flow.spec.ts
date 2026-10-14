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
