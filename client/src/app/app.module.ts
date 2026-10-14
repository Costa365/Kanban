import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { AppComponent } from './app.component';
import { TaskComponent } from './components/task/task.component';
import { AboutComponent } from './components/about/about.component';
import { LoginComponent } from './components/login/login.component';
import { AccountComponent } from './components/account/account.component';
import { PasswordInputComponent } from './components/password-input/password-input.component';
import { AutoFocusDirective } from './auto-focus.directive';
import { MarkdownPipe } from './markdown.pipe';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AuthGuard } from './guards/auth.guard';

const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: LoginComponent, data: { mode: 'signup' } },
  { path: 'forgot-password', component: LoginComponent, data: { mode: 'forgot' } },
  { path: 'resend-verification', component: LoginComponent, data: { mode: 'resend' } },
  { path: 'verify-email', component: LoginComponent, data: { mode: 'verify' } },
  { path: 'reset-password', component: LoginComponent, data: { mode: 'reset' } },
  { path: 'account', component: AccountComponent, canActivate: [AuthGuard] },
  { path: '', component: TaskComponent, canActivate: [AuthGuard] },
  { path: 'about', component: AboutComponent, canActivate: [AuthGuard] },
];

@NgModule({
  declarations: [
    AppComponent,
    TaskComponent,
    AboutComponent,
    LoginComponent,
    AccountComponent,
    PasswordInputComponent,
    AutoFocusDirective,
    MarkdownPipe,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    RouterModule.forRoot(appRoutes),
    DragDropModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
