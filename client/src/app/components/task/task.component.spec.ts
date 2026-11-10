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
    it(`edits a ${source.state} card by double-clicking, with focus, cancel, and save`, async () => {
      const task = { _id: 'task', title: '**Original** task', position: 1, state: source.state };
      const updateTask = jasmine.createSpy('updateTask').and.returnValue(of({}));
      await TestBed.configureTestingModule({
        imports: [AppModule],
        providers: [{ provide: DataService, useValue: { getTasks: () => of([task]), updateTask } }],
      }).compileComponents();
      const fixture = TestBed.createComponent(TaskComponent);
      fixture.detectChanges();
      const card: HTMLElement = fixture.nativeElement.querySelector(`#${source.id} .task-card`);
      card.querySelector('strong').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      let textarea = card.querySelector('textarea');
      expect(textarea.value).toBe('**Original** task');
      expect(document.activeElement).toBe(textarea);
      expect(card.classList.contains('cdk-drag-disabled')).toBeTrue();
      textarea.value = 'Unsaved draft';
      textarea.dispatchEvent(new Event('input'));
      textarea.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();
      expect(fixture.componentInstance.editingTitle).toBe('Unsaved draft');
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(card.querySelector('textarea')).toBeNull();
      expect(card.querySelector('.markdown-body').textContent.trim()).toBe('Original task');
      expect(updateTask).not.toHaveBeenCalled();

      card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      textarea = card.querySelector('textarea');
      textarea.value = 'Saved edit';
      textarea.dispatchEvent(new Event('input'));
      card.querySelector<HTMLButtonElement>('.edit-actions .btn-primary').click();
      fixture.detectChanges();
      expect(card.querySelector('.markdown-body').textContent.trim()).toBe('Saved edit');
      expect(updateTask).toHaveBeenCalledOnceWith({ ...task, title: 'Saved edit' });
    });

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

  it('keeps links, checklist controls, and action buttons out of double-click editing', async () => {
    const task = { _id: 'task', title: '[Link](https://example.com)\n\n- [ ] Checklist', position: 1, state: 'To Do' };
    const updateTask = jasmine.createSpy('updateTask').and.returnValue(of({}));
    await TestBed.configureTestingModule({
      imports: [AppModule],
      providers: [{ provide: DataService, useValue: { getTasks: () => of([task]), updateTask } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TaskComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.task-card');
    for (const selector of ['a', '.task-checkbox', '.card-actions', '[aria-label="Move task"] svg', '[aria-label="Delete task"] svg']) {
      card.querySelector(selector).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();
      expect(card.querySelector('textarea')).withContext(selector).toBeNull();
    }
    card.querySelector('.task-checkbox').click();
    fixture.detectChanges();
    expect(updateTask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ title: '[Link](https://example.com)\n\n- [x] Checklist' }));
    expect(card.querySelector('textarea')).toBeNull();
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
