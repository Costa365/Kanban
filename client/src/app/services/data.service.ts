import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { map } from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(public http:Http) { 
    console.log("Data service connected");
  }

  getTasks(){
    return this.http.get("http://localhost:3000/api/tasks")
    .pipe(map(res => res.json()));
  }
}
