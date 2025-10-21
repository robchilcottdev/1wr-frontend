import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorage, Story } from '../types';
import { ApiService } from '../services/api-service';

@Component({
  selector: 'app-global-modals',
  imports: [],
  templateUrl: './global-modals.html'
})
export class GlobalModals {
  protected readonly router = inject(Router);
  protected readonly apiService = inject(ApiService);
  
  protected retrievedStoryTitle = signal("");
  protected retrievedStoryId = signal("");
  protected retrievedAuthorName = signal("");
  
  @ViewChild('dialogContinueStory') dialogContinueStory!: ElementRef;
  @ViewChild('dialogStoryNotFound') dialogStoryNotFound!: ElementRef;
  
  constructor() {
    // check local storage for current player, current story
    const userId = localStorage.getItem(LocalStorage.UserId);
    const userName = localStorage.getItem(LocalStorage.UserName);
    const storyId = localStorage.getItem(LocalStorage.CurrentStoryId);

    if (userId && userName && storyId) {
      this.retrievedStoryId.set(storyId);
      this.retrievedAuthorName.set(userName);
      this.apiService.getStory(storyId).subscribe({
        next: (story: Story) => {
          this.retrievedStoryTitle.set(story.title);
          this.openContinueStoryDialog();
        },
        error: () => {
          this.openStoryNotFoundDialog();
        }
      });
    }
  }

  openStoryNotFoundDialog(){ this.dialogStoryNotFound.nativeElement.showModal(); }
  closeStoryNotFoundDialog(){ 
    localStorage.removeItem(LocalStorage.CurrentStoryId);
    this.dialogStoryNotFound.nativeElement.close();
  }

  openContinueStoryDialog() { this.dialogContinueStory.nativeElement.showModal(); }
  closeContinueStoryDialog() { this.dialogContinueStory.nativeElement.close(); }

  continueStory() {
    this.closeContinueStoryDialog();
    this.router.navigateByUrl("/stories/" + localStorage.getItem(LocalStorage.CurrentStoryId));
  }

  returnToMenu() {
    localStorage.removeItem(LocalStorage.CurrentStoryId);
    this.closeContinueStoryDialog();
    this.router.navigateByUrl("/");
  }

  disconnect() {
    localStorage.removeItem(LocalStorage.UserName);
    this.dialogStoryNotFound.nativeElement.close();
    this.dialogContinueStory.nativeElement.close();
    this.router.navigateByUrl("/");
  }
}
