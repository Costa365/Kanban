import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { AppComponent } from './app.component';
import { MarkdownHelpComponent } from './components/markdown-help/markdown-help.component';
import { TaskComponent } from './components/task/task.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { AccountComponent } from './components/account/account.component';
import { PasswordInputComponent } from './components/password-input/password-input.component';
import { AutoFocusDirective } from './auto-focus.directive';
import { MarkdownPipe } from './markdown.pipe';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AuthGuard } from './guards/auth.guard';
import { homeGuard } from './guards/home.guard';

const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: LoginComponent, data: { mode: 'signup' } },
  { path: 'forgot-password', component: LoginComponent, data: { mode: 'forgot' } },
  { path: 'resend-verification', component: LoginComponent, data: { mode: 'resend' } },
  { path: 'verify-email', component: LoginComponent, data: { mode: 'verify' } },
  { path: 'reset-password', component: LoginComponent, data: { mode: 'reset' } },
  { path: 'account', component: AccountComponent, canActivate: [AuthGuard] },
  { path: '', component: HomeComponent, pathMatch: 'full', canActivate: [homeGuard] },
  { path: 'board', component: TaskComponent, canActivate: [AuthGuard] },
  { path: 'about', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  declarations: [
    AppComponent,
    TaskComponent,
    MarkdownHelpComponent,
    HomeComponent,
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
