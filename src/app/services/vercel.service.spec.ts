import { TestBed } from '@angular/core/testing';

import { VercelService } from './vercel.service';

describe('VercelService', () => {
  let service: VercelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VercelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
