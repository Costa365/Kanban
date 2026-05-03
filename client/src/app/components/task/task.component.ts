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
  pendingDeleteId: string | null = null;
  editingId: string | null = null;
  editingTitle = '';
  addingNew = false;
  newTaskTitle = '';

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

  startAdd(): void {
    this.addingNew = true;
    this.newTaskTitle = '';
  }

  saveAdd(): void {
    const trimmed = this.newTaskTitle.trim();
    if (!trimmed) {
      this.cancelAdd();
      return;
    }
    this.addingNew = false;
    const newTask: Task = { position: 1, title: trimmed, state: 'To Do', _id: '' };
    this.dataService.addTask(newTask).subscribe((created) => {
      this.todoTasks.push(created);
    });
  }

  cancelAdd(): void {
    this.addingNew = false;
    this.newTaskTitle = '';
  }

  onAddKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cancelAdd();
    }
  }

  startEdit(task: Task): void {
    this.editingId = task._id;
    this.editingTitle = task.title;
  }

  onEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }

  autoResize(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  saveEdit(task: Task): void {
    if (!this.editingId) { return; }
    this.editingId = null;
    const trimmed = this.editingTitle.trim();
    if (!trimmed || trimmed === task.title) { return; }
    const updated = { ...task, title: trimmed };
    const replace = (arr: Task[]) => arr.map((t) => t._id === task._id ? updated : t);
    this.todoTasks = replace(this.todoTasks);
    this.doingTasks = replace(this.doingTasks);
    this.doneTasks = replace(this.doneTasks);
    this.dataService.updateTask(updated).subscribe();
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  deleteTask(id: string): void {
    if (!id) { return; }
    this.pendingDeleteId = id;
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId;
    if (!id) { return; }
    this.pendingDeleteId = null;
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

  cancelDelete(): void {
    this.pendingDeleteId = null;
  }

  trackById(_index: number, task: Task): string {
    return task._id;
  }

  onCheckboxClick(event: MouseEvent, task: Task): void {
    const target = event.target as HTMLElement;
    if (!target.classList?.contains('task-checkbox')) { return; }
    event.preventDefault();
    event.stopPropagation();
    const container = event.currentTarget as HTMLElement;
    const all = container.querySelectorAll('.task-checkbox');
    const idx = Array.prototype.indexOf.call(all, target);
    if (idx < 0) { return; }
    this.toggleCheckbox(task, idx);
  }

  private toggleCheckbox(task: Task, index: number): void {
    let n = -1;
    const re = /^(\s*(?:[-*+]|\d+\.)\s+)\[([ xX]?)\]/gm;
    const newTitle = task.title.replace(re, (match, prefix: string, mark: string) => {
      n++;
      if (n !== index) { return match; }
      const checked = mark === 'x' || mark === 'X';
      return `${prefix}[${checked ? ' ' : 'x'}]`;
    });
    if (newTitle === task.title) { return; }
    const updated = { ...task, title: newTitle };
    const replace = (arr: Task[]) => arr.map((t) => t._id === task._id ? updated : t);
    this.todoTasks = replace(this.todoTasks);
    this.doingTasks = replace(this.doingTasks);
    this.doneTasks = replace(this.doneTasks);
    this.dataService.updateTask(updated).subscribe();
  }
}
