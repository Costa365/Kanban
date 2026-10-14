import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DataService } from './data.service';

describe('DataService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [DataService, provideHttpClient(), provideHttpClientTesting()],
  }));
  it('loads tasks from the API', () => {
    const service = TestBed.inject(DataService);
    const http = TestBed.inject(HttpTestingController);
    service.getTasks().subscribe((tasks) => expect(tasks).toEqual([]));
    http.expectOne('/api/tasks').flush([]);
    http.verify();
  });
});
