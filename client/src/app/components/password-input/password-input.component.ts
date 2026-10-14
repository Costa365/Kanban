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
        [attr.aria-pressed]="visible" [attr.aria-controls]="inputId">{{ visible ? 'Hide' : 'Show' }}</button>
    </div>`,
  styles: [`
    :host { display: block; }
    .password-field { display: flex; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); }
    .password-field:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
    input { min-width: 0; width: 100%; padding: 10px 14px; border: none; background: transparent; color: var(--text); font: inherit; font-size: 14px; outline: none; }
    button { padding: 0 12px; border: none; border-left: 1px solid var(--border); background: transparent; color: var(--accent); font: inherit; font-size: 13px; cursor: pointer; }
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
