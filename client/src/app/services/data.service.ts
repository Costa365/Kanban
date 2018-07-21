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
    return this.http.post(this.apiUri + "task", newTask)
      .subscribe(
        res => {
          console.log("addTask: " + res);
        },
        err => {
          console.log("addTask: Error occured");
        }
      );
  }

  updateTask (updatedTask: task) {
    console.log("Service updateTask: ", updatedTask._id, updatedTask.position, updatedTask.title, updatedTask.state);
    return this.http.put(this.apiUri + "task/" + updatedTask._id, updatedTask)
      .subscribe(
        res => {
          console.log("updateTask: " + res);
        },
        err => {
          console.log("updateTask: Error occured");
        }
      );
  }

  deleteTask (id: number) {
    return this.http.delete(this.apiUri + "task\\" + id)
      .subscribe(
        res => {
          console.log("deleteTask: " + res);
        },
        err => {
          console.log("deleteTask: Error occured");
        }
      );
  }
}
