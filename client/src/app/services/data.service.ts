import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { map } from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class DataService {

  readonly apiUri: string = "http://localhost:3000/api/"

  constructor(public http:Http) { 
    console.log("Data service connected");
  }

  getTasks(){
    return this.http.get(this.apiUri + "tasks")
    .pipe(map(res => res.json()));
  }


  addTask (newTask: task) {
    const req = this.http.post(this.apiUri + "task", newTask)
      .subscribe(
        res => {
          console.log(res);
        },
        err => {
          console.log("Error occured");
        }
      );
  }
}
