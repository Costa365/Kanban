import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppModule } from '../../app.module';
import { DataService } from '../../services/data.service';
import { TaskComponent } from './task.component';

describe('TaskComponent', () => {
  it('shows a board with no tasks', async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule],
      providers: [{ provide: DataService, useValue: { getTasks: () => of([]) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TaskComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.todoTasks).toEqual([]);
    expect(fixture.componentInstance.doingTasks).toEqual([]);
    expect(fixture.componentInstance.doneTasks).toEqual([]);
  });
});
