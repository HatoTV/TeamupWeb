import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmailService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the structured request to the same-origin endpoint', () => {
    const request = { type: 'no_data' as const, champion1: 'Ahri', champion2: 'Zed', message: '', website: '' };
    service.sendMatchupUpdateRequest(request).subscribe();

    const req = http.expectOne('/api/send-email');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ ok: true });
  });
});
