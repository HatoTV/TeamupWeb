import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../language.service';
import { LeftBarComponent } from '../left-bar/left-bar.component';

@Component({
  selector: 'top-bar',
  standalone: true,
  imports: [CommonModule,LeftBarComponent],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.css',
})
export class TopBarComponent {
  constructor(private router: Router, private translate: TranslateService,private languageService: LanguageService) {}
  itemsSections = [
    { logoUrl: 'assets/img/icons/League of Legends.png', title: 'League Of Legends', isSelected:true },
    //{ logoUrl: 'assets/img/icons/Rocket League.png', title: 'Rocket League', isSelected:false },
  ];
  lang : string = "fr";  
  isMenuOpen = false;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  goToUrl(){
    const defaultLang : string = this.translate.defaultLang || 'fr'
    this.router.navigate([`/${defaultLang}` + '/lol/matchups']);
  }
  onChangeLanguage() {
    if(this.lang==="fr"){
      this.lang = "en"
    }
    else 
    if(this.lang==="en"){
      this.lang = "fr"
    }
    this.languageService.changeLanguage(this.lang);
  }
}
