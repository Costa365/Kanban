import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-password-input',
  standalone: false,
  template: `
    <div class="password-field">
      <input [id]="inputId" [type]="visible ? 'text' : 'password'" [value]="value"
        [autocomplete]="autocomplete" [required]="required" [attr.minlength]="minlength"
        [disabled]="disabled" (input)="input($event)" (blur)="onTouched()">
      <button type="button" [disabled]="disabled" (click)="visible = !visible"
        [attr.aria-label]="visible ? 'Hide password' : 'Show password'"
        [attr.title]="visible ? 'Hide password' : 'Show password'"
        [attr.aria-pressed]="visible" [attr.aria-controls]="inputId">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          @if (visible) {
            <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24M10.73 5.08A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a19.73 19.73 0 0 1-3.13 3.87M6.61 6.61A21.77 21.77 0 0 0 1 12s4 7 11 7a10.9 10.9 0 0 0 5.39-1.61" />
            <path d="m1 1 22 22" />
          } @else {
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
            <circle cx="12" cy="12" r="3" />
          }
        </svg>
      </button>
    </div>`,
  styles: [`
    :host { display: block; }
    .password-field { display: flex; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); }
    .password-field:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
    input { min-width: 0; width: 100%; padding: 10px 14px; border: none; background: transparent; color: var(--text); font: inherit; font-size: 14px; outline: none; }
    button { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; min-width: 44px; padding: 0 12px; border: none; border-left: 1px solid var(--border); border-radius: 0 var(--radius) var(--radius) 0; background: transparent; color: var(--accent); cursor: pointer; }
    button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    :disabled { opacity: .6; cursor: not-allowed; }
  `],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PasswordInputComponent), multi: true }],
})
export class PasswordInputComponent implements ControlValueAccessor {
  @Input() inputId = 'password';
  @Input() autocomplete = 'current-password';
  @Input() minlength = 1;
  @Input() required = true;
  value = '';
  visible = false;
  disabled = false;
  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  input(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
  writeValue(value: string): void { this.value = value || ''; if (!this.value) this.visible = false; }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }
}
