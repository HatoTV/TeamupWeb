import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LolStatsService } from '../../services/lol-stats.service';

@Component({
  selector: 'app-builds',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './builds.component.html',
  styleUrl: './builds.component.css'
})
export class BuildsComponent {
  builds: any[] = [];
  currentPatch = '15.3'; // Patch actuel à vérifier

  constructor(private lolStatsService: LolStatsService) {}

  ngOnInit() {
    this.loadBuilds();
  }

  async loadBuilds() {
    try {
      const players = await this.lolStatsService.getTopPlayers().toPromise();
      const summonerIds = players.entries.map((player: any) => player.summonerId);

      for (const summonerId of summonerIds.slice(0, 5)) { // On limite pour éviter les limites de requêtes
        const puuidData = await this.lolStatsService.getPuuid(summonerId).toPromise();
        const puuid = puuidData.puuid;

        const matchIds = await this.lolStatsService.getMatches(puuid).toPromise();

        for (const matchId of matchIds) {
          const matchData = await this.lolStatsService.getMatchDetails(matchId).toPromise();
          const matchPatch = matchData.info.gameVersion.split('.')[0] + '.' + matchData.info.gameVersion.split('.')[1];

          if (matchPatch === this.currentPatch) {
            this.builds.push(...this.extractBuilds(matchData));
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des builds:', error);
    }
  }

  extractBuilds(matchData: any) {
    return matchData.info.participants.map((player: any) => ({
      champion: player.championName,
      items: [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5, player.item6],
      runes: player.perks.styles.map((style: any) => style.selections.map((rune: any) => rune.perk)).flat(),
      win: player.win
    }));
  }
}
