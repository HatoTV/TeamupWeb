// votre-service-email.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private apiUrl = 'http://localhost:4000/api/send-email'; // L'URL de votre serveur

  constructor(private http: HttpClient) {}

  sendEmail(subject: string, message: string): Observable<any> {
      return this.http.post(this.apiUrl, { subject, message });
  }
}
