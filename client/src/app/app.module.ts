import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { TaskComponent } from './components/task/task.component';

import { DataService } from './services/data.service';
import { AboutComponent } from './components/about/about.component';

const appRoutes: Routes = [
  {path:'', component:TaskComponent},
  {path:'about', component:AboutComponent},
]

@NgModule({
  declarations: [
    AppComponent,
    TaskComponent,
    AboutComponent
  ],
  imports: [
    BrowserModule,
    HttpModule,
    RouterModule.forRoot(appRoutes)
  ],
  providers: [DataService],
  bootstrap: [AppComponent]
})
export class AppModule { }
