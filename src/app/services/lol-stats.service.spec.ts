import { TestBed } from '@angular/core/testing';

import { LolStatsService } from './lol-stats.service';

describe('LolStatsService', () => {
  let service: LolStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LolStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
