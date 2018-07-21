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

    this.dragulaService.setOptions('bag-tasks', {
      revertOnSpill: false
    });

    this.dragulaService.drop.subscribe((args: any) => {
      const [bagName, elSource, bagTarget, bagSource, elTarget] = args;
      const newIndex = elTarget ? this.getElementIndex(elTarget) : bagTarget.childElementCount;

      console.log('----------Dropped-------------');
      console.log(`bagName: ${bagName}`);
      console.log(`elSource: ${elSource.getAttribute('id')}`);
      console.log(`bagTarget: ${bagTarget.getAttribute('column-id')}`);
      console.log(`bagSource: ${bagSource.getAttribute('column-id')}`);
      if(elTarget){
        console.log(`elTarget: ${elTarget.getAttribute('id')}`);
      }
      console.log(`newIndex: ${newIndex}`);
      console.log(`Text: ${elSource.textContent}`);

      const updatedTask:task = {
        position: parseInt(newIndex),
        title: elSource.textContent.trim(),
        state: this.getStateFromColumn(bagTarget.getAttribute('column-id')),
        _id: elSource.getAttribute('id')
      }

      this.updateTask(updatedTask);

      this.tasks.forEach( (element) => {
        console.log("XXXXX: " + element.state + ", " + element.position + ", " + element.title);
      }); 
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
    this.getTasks();
  }

  getTasks() {
    this.dataService.getTasks().subscribe((tasks)=>{
      this.tasks = tasks;
    })
  }

  filterItemsOfType(type){
    return this.tasks.filter(x => x.state == type);
  }

  addTask(title) {
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

  updateTask(task) {
    this.dataService.updateTask(task).add(()=>{
      this.getTasks();
    })
  
    return false;
  }

  deleteTask(id) {
    console.log("Delete: " + id);
    if (confirm("Are you sure?") == true) {
      this.dataService.deleteTask(id).add(()=>{
        this.getTasks();
      })
    }   
  }
}
