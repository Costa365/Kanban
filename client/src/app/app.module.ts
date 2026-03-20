import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { AppComponent } from './app.component';
import { TaskComponent } from './components/task/task.component';
import { AboutComponent } from './components/about/about.component';
import { AutoFocusDirective } from './auto-focus.directive';

const appRoutes: Routes = [
  { path: '', component: TaskComponent },
  { path: 'about', component: AboutComponent },
];

@NgModule({
  declarations: [
    AppComponent,
    TaskComponent,
    AboutComponent,
    AutoFocusDirective,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot(appRoutes),
    DragDropModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
