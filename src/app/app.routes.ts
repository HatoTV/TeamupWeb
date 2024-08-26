import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
export const routes: Routes = [
    { path: 'en', component: AppComponent },
    { path: 'fr', component: AppComponent },
    { path: '', redirectTo: '/en', pathMatch: 'full' }, // Redirige vers l'anglais par défaut
    { path: '**', redirectTo: '/en' } // Gère les URL non reconnues
  ];
