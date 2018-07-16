import { Component, OnInit } from '@angular/core';
import { DataService} from '../../services/data.service';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.css']
})
export class TaskComponent implements OnInit {

  tasks: task[];

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.dataService.getTasks().subscribe((tasks)=>{
      this.tasks = tasks;
    })
  }

  addTask(title){
    const newTask:task = {
      _id: null,
      title: title,
      state: "To Do"
    }
    this.dataService.addTask(newTask)
    return false;
  }


}
