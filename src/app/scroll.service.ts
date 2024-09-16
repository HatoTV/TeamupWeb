import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private scrollToSectionSubject = new Subject<string>();

  // Observable to listen to scroll events
  scrollToSection$ = this.scrollToSectionSubject.asObservable();

  // Method to trigger scrolling
  scrollToSection(sectionId: string) {
    this.scrollToSectionSubject.next(sectionId);
  }
}
