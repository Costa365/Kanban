import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { AccountComponent } from './account.component';
import { PasswordInputComponent } from '../password-input/password-input.component';
import { AuthService } from '../../services/auth.service';

describe('AccountComponent', () => {
  let auth: jasmine.SpyObj<AuthService>;
  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', ['getEmail', 'changePassword', 'closeAccount', 'logout']);
    auth.getEmail.and.returnValue('person@example.test');
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterModule.forRoot([])],
      declarations: [AccountComponent, PasswordInputComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  it('requires confirmation and acknowledgement before closure, then clears the session', () => {
    const fixture = TestBed.createComponent(AccountComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('.danger-action').disabled).toBeTrue();
    component.closurePassword = 'current password';
    component.closeAccount();
    expect(auth.closeAccount).not.toHaveBeenCalled();
    component.confirmation = 'DELETE';
    component.acknowledged = true;
    auth.closeAccount.and.returnValue(of({ message: 'Deleted.' }));
    component.closeAccount();
    expect(auth.closeAccount).toHaveBeenCalledWith('current password', 'DELETE');
    expect(auth.logout).toHaveBeenCalledWith('account-closed');
  });

  it('requires matching new passwords and clears password fields after success', () => {
    const fixture = TestBed.createComponent(AccountComponent);
    const component = fixture.componentInstance;
    component.newPassword = 'new password';
    component.confirmPassword = 'different password';
    component.changePassword();
    expect(auth.changePassword).not.toHaveBeenCalled();
    component.currentPassword = 'current password';
    component.confirmPassword = component.newPassword;
    auth.changePassword.and.returnValue(of({ token: 'fresh', email: 'person@example.test', message: 'Password changed.' }));
    component.changePassword();
    expect(auth.changePassword).toHaveBeenCalledWith('current password', 'new password');
    expect(component.passwordMessage).toBe('Password changed.');
    expect(component.currentPassword).toBe('');
    expect(component.newPassword).toBe('');
    expect(component.confirmPassword).toBe('');
  });
});
