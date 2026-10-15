import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const homeGuard: CanActivateFn = () => {
  return inject(AuthService).isLoggedIn()
    ? inject(Router).createUrlTree(['/board'])
    : true;
};
