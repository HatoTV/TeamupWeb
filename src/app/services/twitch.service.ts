import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { VercelService } from './vercel.service';

@Injectable({
  providedIn: 'root'
})
export class TwitchService {
  private clientId = '';
  private accessToken= '';
  private username = 'Hato_TV';
  private apiUrl = `https://api.twitch.tv/helix/streams?user_login=${this.username}`;

  constructor(private http: HttpClient, private vercelService: VercelService) {
    this.vercelService.getData().subscribe(response => {
      this.clientId = response.TWITCH_CLIENT_ID
      this.accessToken = response.TWITCH_TOKEN
    }, error => {
      console.error('Erreur lors de la récupération', error);
    });
  }

  checkLiveStatus(): Observable<{ isLive: boolean, streamUrl?: string, streamTitle?: string }> {
    // return of({
    //   isLive: true, // Simuler que le stream est en direct
    //   streamUrl: `https://player.twitch.tv/?channel=${this.username}&parent=localhost&parent=teamupp.app`, // Remplacez par votre nom d'utilisateur
    //   streamTitle: 'Titre de votre stream' // Titre fictif pour le test
    // });
    return timer(0, 60000).pipe( // Vérifier toutes les minutes
      switchMap(() => this.http.get<any>(this.apiUrl, {
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${this.accessToken}`
        }
      })),
      map(response => {
        const isLive = response.data.length > 0;
        let streamUrl = '';
        let streamTitle = '';
        if (isLive) {
          streamUrl = `https://player.twitch.tv/?channel=${this.username}&parent=teamupp.app`; // Remplacez par l'URL du stream
          streamTitle = response.data[0].title; // Titre du stream
        }
        return { isLive, streamUrl, streamTitle };
      })
    );
  }
  
}