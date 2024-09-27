import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'popup-twitch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './popup-twitch.component.html',
  styleUrl: './popup-twitch.component.css'
})
export class PopupTwitchComponent {
  isVisible = false;
  @Input() streamUrl: string = '';
  @Input() streamTitle: string = '';
  safeStreamUrl: SafeResourceUrl = ''; // Propriété pour stocker l'URL sécurisée
  profileImageUrl = 'assets/img/HatoPP_circular.png'; // Remplacez par l'URL de votre image de profil

  constructor(private sanitizer: DomSanitizer) {}

  showPopup() {
    this.isVisible = true;
    this.safeStreamUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.streamUrl);
  }

  closePopup() {
    this.isVisible = false;
  }
}
