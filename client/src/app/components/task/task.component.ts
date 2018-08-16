import { Component, OnInit } from '@angular/core';
import { DataService} from '../../services/data.service';
import { DragulaService } from 'ng2-dragula/ng2-dragula';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.css']
})
export class TaskComponent implements OnInit {

  tasks: task[];

   constructor(private dataService: DataService, private dragulaService: DragulaService) { 
    this.dragulaService.drop.subscribe((args: any) => {
      const [bagName, elSource, bagTarget, bagSource, elTarget] = args;
      this.updateTasks(bagSource, bagTarget);
    });
  }

  private getStateFromColumn(column){
    switch(column) { 
      case "col_doing": { 
         return "In Progress";
      } 
      case "col_done": { 
        return "Done";
      } 
      case "col_to_do":
      default: { 
        return "To Do";
      }
    } 
  }

  private getElementIndex(el: HTMLElement): number {
    return [].slice.call(el.parentElement.children).indexOf(el);
  }

  ngOnInit() {
    this.dragulaService.setOptions('bag-tasks', {
      revertOnSpill: false
    });
    this.getTasks();
  }

  ngOnDestroy() {
    this.dragulaService.destroy("bag-tasks");
  }

  private getTasks() {
    this.dataService.getTasks().subscribe((tasks)=>{
      this.tasks = tasks;
    })
  }

  private addTask(title) {
    const newTask:task = {
      position: 1,
      title: title,
      state: "To Do",
      _id: null
    }
    this.dataService.addTask(newTask).add(()=>{
      this.getTasks();
    })
    return false;
  }

  private updateTaskThenGetTasks(task) {
    this.dataService.updateTask(task).add(()=>{
      this.getTasks();
    })
    return false;
  }

  private updateTasks(bagSource, bagTarget) {
    for (var i = 0; i < bagSource.children.length; i++) { 
      this.updateTask(bagSource.children[i].id, bagSource.children[i].textContent, i+1, 
        bagSource.getAttribute('column-id'));
    }
    for (var i = 0; i < bagTarget.children.length; i++) { 
      this.updateTask(bagTarget.children[i].id, bagTarget.children[i].textContent, i+1, 
        bagTarget.getAttribute('column-id'));
    }
  }

  private updateTask(id, title, position, state) {  
    const updatedTask:task = {
      position: position,
      title: title,
      state: this.getStateFromColumn(state),
      _id: id
    }
    this.updateTaskThenGetTasks(updatedTask); 
  }

  private deleteTask(id) {
    console.log("Delete: " + id);
    if (confirm("Are you sure?") == true) {
      this.dataService.deleteTask(id).add(()=>{
        this.getTasks();
      })
    }   
  }
}
