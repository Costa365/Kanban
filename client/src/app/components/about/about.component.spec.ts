import { TestBed } from '@angular/core/testing';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  it('explains verification and account management', async () => {
    await TestBed.configureTestingModule({ declarations: [AboutComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('verification email');
    expect(fixture.nativeElement.textContent).toContain('close your account');
  });
});
