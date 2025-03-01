import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VercelService {
  private apiUrl = 'https://teamup-hatotvs-projects.vercel.app/api/vercel-datas';

  constructor(private http: HttpClient) {}

  // Méthode pour récupérer les données sensibles depuis l'API
  getData(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
}
