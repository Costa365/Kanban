import { TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { of } from 'rxjs';
import { AppModule } from '../../app.module';
import { DataService } from '../../services/data.service';
import { TaskComponent } from './task.component';

describe('TaskComponent', () => {
  const columns = [
    { id: 'col_to_do', state: 'To Do' },
    { id: 'col_doing', state: 'In Progress' },
    { id: 'col_done', state: 'Done' },
  ];
  columns.forEach((source, index) => {
    const destination = columns[(index + 1) % columns.length];
    it(`moves a lower card from ${source.state} using the shortcut and preserves its state when edited`, async () => {
      const task = { _id: 'moving', title: 'Move me', position: 2, state: source.state };
      const remaining = { _id: 'remaining', title: 'Stay here', position: 1, state: source.state };
      const other = { _id: 'other', title: 'Already there', position: 1, state: destination.state };
      const updateTask = jasmine.createSpy('updateTask').and.returnValue(of({}));
      await TestBed.configureTestingModule({
        imports: [AppModule],
        providers: [{ provide: DataService, useValue: { getTasks: () => of([remaining, task, other]), updateTask } }],
      }).compileComponents();
      const fixture = TestBed.createComponent(TaskComponent);
      fixture.detectChanges();
      const trigger = fixture.nativeElement.querySelectorAll(`#${source.id} [aria-label="Move task"]`)[1];
      trigger.click();
      fixture.detectChanges();
      const overlay = TestBed.inject(OverlayContainer).getContainerElement();
      const options = Array.from(overlay.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
      expect(options.map((option) => option.textContent.trim())).toEqual(
        columns.filter((column) => column !== source).map((column) => `Move to ${column.state}`));
      options.find((option) => option.textContent.trim() === `Move to ${destination.state}`).click();
      fixture.detectChanges();
      expect(overlay.querySelector('[role="menu"]')).toBeNull();
      const cards = fixture.nativeElement.querySelectorAll(`#${destination.id} .markdown-body`);
      expect(Array.from(cards, (card: HTMLElement) => card.textContent.trim())).toEqual(['Move me', 'Already there']);
      expect(fixture.nativeElement.querySelectorAll(`#${source.id} .task-card`).length).toBe(1);
      expect(updateTask).toHaveBeenCalledWith(jasmine.objectContaining({ _id: 'moving', state: destination.state, position: 1 }));
      expect(updateTask).toHaveBeenCalledWith(jasmine.objectContaining({ _id: 'other', position: 2 }));
      fixture.componentInstance.startEdit(task);
      fixture.componentInstance.editingTitle = 'Edited after moving';
      fixture.componentInstance.saveEdit(task);
      expect(updateTask.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
        title: 'Edited after moving', state: destination.state, position: 1,
      }));
    });
  });

  it('dismisses the move menu with Escape without changing a task', async () => {
    const task = { _id: 'task', title: 'Stay here', position: 1, state: 'To Do' };
    const updateTask = jasmine.createSpy('updateTask');
    await TestBed.configureTestingModule({
      imports: [AppModule],
      providers: [{ provide: DataService, useValue: { getTasks: () => of([task]), updateTask } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TaskComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('[aria-label="Move task"]');
    trigger.click();
    fixture.detectChanges();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    overlay.querySelector('[role="menuitem"]').dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', keyCode: 27, bubbles: true,
    }));
    fixture.detectChanges();
    expect(overlay.querySelector('[role="menu"]')).toBeNull();
    expect(updateTask).not.toHaveBeenCalled();
    expect(fixture.componentInstance.todoTasks).toEqual([task]);
    expect(document.activeElement).toBe(trigger);
  });

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
