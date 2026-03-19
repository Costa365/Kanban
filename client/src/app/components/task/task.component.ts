import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { DataService } from '../../services/data.service';
import { Task } from './task';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.css'],
  standalone: false,
})
export class TaskComponent implements OnInit {
  todoTasks: Task[] = [];
  doingTasks: Task[] = [];
  doneTasks: Task[] = [];

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.getTasks();
  }

  private getTasks(): void {
    this.dataService.getTasks().subscribe((tasks) => {
      this.todoTasks = tasks.filter((t) => t.state === 'To Do');
      this.doingTasks = tasks.filter((t) => t.state === 'In Progress');
      this.doneTasks = tasks.filter((t) => t.state === 'Done');
    });
  }

  private getStateFromColumnId(columnId: string): string {
    switch (columnId) {
      case 'col_doing': return 'In Progress';
      case 'col_done': return 'Done';
      default: return 'To Do';
    }
  }

  private persistColumnOrder(columnId: string, tasks: Task[]): void {
    const state = this.getStateFromColumnId(columnId);
    tasks.forEach((task, index) => {
      this.dataService.updateTask({ ...task, position: index + 1, state }).subscribe();
    });
  }

  onDrop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      this.persistColumnOrder(event.previousContainer.id, event.previousContainer.data);
    }
    this.persistColumnOrder(event.container.id, event.container.data);
  }

  addTask(title: string): void {
    if (!title.trim()) { return; }
    const newTask: Task = { position: 1, title: title.trim(), state: 'To Do', _id: '' };
    this.dataService.addTask(newTask).subscribe((created) => {
      this.todoTasks.push(created);
    });
  }

  deleteTask(id: string): void {
    if (!id) { return; }
    if (confirm('Are you sure?')) {
      const prev = { todo: this.todoTasks, doing: this.doingTasks, done: this.doneTasks };
      this.todoTasks = this.todoTasks.filter((t) => t._id !== id);
      this.doingTasks = this.doingTasks.filter((t) => t._id !== id);
      this.doneTasks = this.doneTasks.filter((t) => t._id !== id);
      this.dataService.deleteTask(id).subscribe({
        error: () => {
          this.todoTasks = prev.todo;
          this.doingTasks = prev.doing;
          this.doneTasks = prev.done;
        },
      });
    }
  }
}
