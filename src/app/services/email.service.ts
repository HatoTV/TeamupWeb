// votre-service-email.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private apiUrl = 'https://teamup-hatotvs-projects.vercel.app/api/send-email';

  constructor(private http: HttpClient) {}

  sendEmail(subject: string, message: string): Observable<any> {
      return this.http.post(this.apiUrl, { subject, message });
  }
}
