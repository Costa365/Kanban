import { TestBed } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../services/auth.service';
import { AuthInterceptor } from './auth.interceptor';

describe('AuthInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let auth: jasmine.SpyObj<AuthService>;
  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['getToken', 'logout']);
    auth.getToken.and.returnValue('current-session');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });
  afterEach(() => http.verify());

  it('attaches sessions to protected account endpoints and signs out on revoked sessions', () => {
    client.post('/api/auth/change-password', {}).subscribe({ error: () => {} });
    const request = http.expectOne('/api/auth/change-password');
    expect(request.request.headers.get('Authorization')).toBe('Bearer current-session');
    request.flush({ error: 'Session revoked' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalled();
  });

  it('keeps public login and external URLs free of tokens', () => {
    for (const url of ['/api/auth/login', 'https://example.test/api/tasks']) {
      client.post(url, {}).subscribe();
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBeFalse();
      request.flush({});
    }
  });
});
