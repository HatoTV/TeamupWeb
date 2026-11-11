import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Closed list mirrored by `api/send-email.js`. */
export type MatchupRequestType = 'no_data' | 'wrong_data';

export interface MatchupUpdateRequest {
  type: MatchupRequestType;
  champion1: string;
  champion2: string;
  message?: string;
  /** Honeypot field: must stay empty for real users. */
  website?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private readonly apiUrl = '/api/send-email';

  constructor(private http: HttpClient) {}

  sendMatchupUpdateRequest(request: MatchupUpdateRequest): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.apiUrl, request);
  }
}
