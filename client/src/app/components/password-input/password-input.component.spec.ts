import { TestBed } from '@angular/core/testing';
import { PasswordInputComponent } from './password-input.component';

describe('PasswordInputComponent', () => {
  it('reveals and hides without losing the typed password or submitting a form', async () => {
    await TestBed.configureTestingModule({ declarations: [PasswordInputComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PasswordInputComponent);
    const changes = jasmine.createSpy('changes');
    fixture.componentInstance.registerOnChange(changes);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    input.value = 'typed password';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.type).toBe('password');
    expect(changes).toHaveBeenCalledWith('typed password');
    expect(toggle.type).toBe('button');
    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(input.value).toBe('typed password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
    expect(input.value).toBe('typed password');
  });
});
