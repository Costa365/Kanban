import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isApi = req.url.startsWith('/api/');
    const protectedAccount = req.url === '/api/auth/change-password' || req.url === '/api/auth/account';
    if (!isApi || (req.url.startsWith('/api/auth/') && !protectedAccount)) {
      return next.handle(req);
    }

    const token = this.authService.getToken();
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }

    return next.handle(req).pipe(
      tap({
        error: (err: HttpErrorResponse) => {
          if (err.status === 401 && token) {
            this.authService.logout();
          }
        },
      }),
    );
  }
}
