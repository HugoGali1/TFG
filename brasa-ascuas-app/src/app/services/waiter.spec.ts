import { TestBed } from '@angular/core/testing';

import { Waiter } from './waiter';

describe('Waiter', () => {
  let service: Waiter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Waiter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
