import { RouterModule } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  it('explains verification and account management', async () => {
    await TestBed.configureTestingModule({ declarations: [HomeComponent], imports: [RouterModule.forRoot([])] }).compileComponents();
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('verification email');
    expect(fixture.nativeElement.textContent).toContain('close your account');
  });
});
