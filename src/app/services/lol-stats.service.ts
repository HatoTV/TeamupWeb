import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LolStatsService {

  private riotApiKey = "RGAPI-44c15026-9e33-40cd-86bb-cbc7e3c3898e";
  private headers = new HttpHeaders({
    'X-Riot-Token': this.riotApiKey
  });

  constructor(private http: HttpClient) {}

  // Récupérer les joueurs challengers
  getTopPlayers(): Observable<any> {
    return this.http.get(`https://euw1.api.riotgames.com/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5`, { headers: this.headers });
  }

  // Récupérer les infos d'un joueur par Summoner ID
  getPuuid(summonerId: string): Observable<any> {
    return this.http.get(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/${summonerId}`, { headers: this.headers });
  }

  // Récupérer les matchs d’un joueur par PUUID
  getMatches(puuid: string): Observable<any> {
    return this.http.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=100`, { headers: this.headers });
  }

  // Récupérer les détails d’un match
  getMatchDetails(matchId: string): Observable<any> {
    return this.http.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}`, { headers: this.headers });
  }
}
