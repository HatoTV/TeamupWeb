import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'baneer-warning',
  standalone: true,
  imports: [CommonModule,TranslateModule],
  templateUrl: './baneer-warning.component.html',
  styleUrl: './baneer-warning.component.css'
})
export class BaneerWarningComponent {
  showBanner: boolean = true; // Variable pour contrôler l'affichage de la bannière

}
