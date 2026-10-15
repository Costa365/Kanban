import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LoginComponent } from './login.component';
import { PasswordInputComponent } from '../password-input/password-input.component';

describe('LoginComponent account flows', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let location: jasmine.SpyObj<Location>;

  async function setup(mode: string, fragment: string | null = null) {
    auth = jasmine.createSpyObj('AuthService', ['register', 'login', 'forgotPassword', 'resendVerification', 'verifyEmail', 'resetPassword', 'clearSession']);
    router = jasmine.createSpyObj('Router', ['navigate'], { url: '/' + mode + (fragment ? '#' + fragment : '') });
    location = jasmine.createSpyObj('Location', ['replaceState']);
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterModule.forRoot([])],
      declarations: [LoginComponent, PasswordInputComponent],
      providers: [
        { provide: AuthService, useValue: auth }, { provide: Router, useValue: router },
        { provide: Location, useValue: location },
        { provide: ActivatedRoute, useValue: { data: of({ mode }),
          snapshot: { fragment, queryParamMap: convertToParamMap({}) } } },
      ],
    }).overrideTemplate(LoginComponent, '<div>{{ message }}</div>').compileComponents();
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('signup waits for verification and clears passwords without navigating to the board', async () => {
    const fixture = await setup('signup');
    auth.register.and.returnValue(of({ message: 'Check your email.' }));
    const component = fixture.componentInstance;
    component.email = 'person@example.test';
    component.password = component.confirmPassword = 'chosen password';
    component.submit();
    expect(auth.register).toHaveBeenCalledWith(component.email, 'chosen password');
    expect(component.completed).toBeTrue();
    expect(component.message).toBe('Check your email.');
    expect(component.password).toBe('');
    expect(component.confirmPassword).toBe('');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('opens the private board after successful sign-in', async () => {
    const fixture = await setup('login');
    auth.login.and.returnValue(of({ token: 'session-token', email: 'person@example.test' }));
    fixture.componentInstance.email = 'person@example.test';
    fixture.componentInstance.password = 'chosen password';
    fixture.componentInstance.submit();
    expect(router.navigate).toHaveBeenCalledWith(['/board']);
  });

  it('prevents submission when confirmation differs or the UTF-8 password exceeds bcrypt limit', async () => {
    const fixture = await setup('signup');
    const component = fixture.componentInstance;
    component.password = 'chosen password';
    component.confirmPassword = 'another password';
    component.submit();
    expect(component.error).toContain('do not match');
    component.password = component.confirmPassword = '😀'.repeat(19);
    component.submit();
    expect(component.error).toContain('72 UTF-8 bytes');
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('reads a verification token from the fragment and removes it before confirmation', async () => {
    const token = 'a'.repeat(64);
    const fixture = await setup('verify', 'token=' + token);
    expect(location.replaceState).toHaveBeenCalledWith('/verify');
    auth.verifyEmail.and.returnValue(of({ message: 'Verified.' }));
    fixture.componentInstance.submit();
    expect(auth.verifyEmail).toHaveBeenCalledWith(token);
    expect(fixture.componentInstance.completed).toBeTrue();
  });

  it('shows missing-token recovery without submitting a reset', async () => {
    const fixture = await setup('reset');
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.error).toContain('missing or invalid');
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('clears the old session after successful password reset', async () => {
    const fixture = await setup('reset', 'token=' + 'a'.repeat(64));
    auth.resetPassword.and.returnValue(of({ message: 'Reset complete.' }));
    fixture.componentInstance.password = fixture.componentInstance.confirmPassword = 'new password';
    fixture.componentInstance.submit();
    expect(auth.clearSession).toHaveBeenCalled();
    expect(fixture.componentInstance.completed).toBeTrue();
  });

  it('keeps email recovery usable for another request and displays delivery failures', async () => {
    const fixture = await setup('forgot');
    auth.forgotPassword.and.returnValue(of({ message: 'Check your email.' }));
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.completed).toBeFalse();
    auth.forgotPassword.and.returnValue(throwError(() => ({ error: { error: 'Email unavailable' } })));
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.error).toBe('Email unavailable');
    expect(fixture.componentInstance.loading).toBeFalse();
  });
});
