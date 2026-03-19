import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task } from '../components/task/task';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly apiUri = '/api/';

  constructor(private http: HttpClient) {}

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.apiUri + 'tasks');
  }

  addTask(task: Task): Observable<Task> {
    return this.http.post<Task>(this.apiUri + 'task', task);
  }

  updateTask(task: Task): Observable<Task> {
    return this.http.put<Task>(this.apiUri + 'task/' + task._id, task);
  }

  deleteTask(id: string): Observable<unknown> {
    return this.http.delete(this.apiUri + 'task/' + id);
  }
}
