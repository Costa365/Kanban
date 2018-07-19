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

  options: any = {
    removeOnSpill: false
  }

  constructor(private dataService: DataService, private dragulaService: DragulaService) { 
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
    });
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
      _id: null,
      title: title,
      state: "To Do"
    }
    this.dataService.addTask(newTask).add(()=>{
      this.getTasks();
    })

    return false;
  }
}
