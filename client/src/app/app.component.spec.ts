import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';
import { AuthService } from './services/auth.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule],
      providers: [{ provide: AuthService, useValue: { isLoggedIn: () => true, getEmail: () => 'test@example.test' } }],
    }).compileComponents();
  });

  it('offers account settings in the desktop and mobile navigation', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav a[href="/account"]')).toBeTruthy();
    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.mobile-menu a[href="/account"]')).toBeTruthy();
  });
});
