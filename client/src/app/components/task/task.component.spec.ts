import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppModule } from '../../app.module';
import { DataService } from '../../services/data.service';
import { TaskComponent } from './task.component';

describe('TaskComponent', () => {
  it('keeps a newly saved task before existing To Do cards', async () => {
    const existing = { _id: 'existing', title: 'Existing', position: 1, state: 'To Do' };
    const created = { _id: 'new', title: 'New task', position: 0, state: 'To Do' };
    await TestBed.configureTestingModule({
      imports: [AppModule],
      providers: [{ provide: DataService, useValue: {
        getTasks: () => of([existing]),
        addTask: () => of(created),
      } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TaskComponent);
    fixture.detectChanges();
    fixture.componentInstance.startAdd();
    fixture.componentInstance.newTaskTitle = 'New task';
    fixture.componentInstance.saveAdd();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('#col_to_do .markdown-body');
    expect(Array.from(cards, (card: HTMLElement) => card.textContent.trim())).toEqual(['New task', 'Existing']);
  });

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
