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
  protected retrievedAuthorId = signal("");
  protected retrievedAuthorName = signal("");
  
  @ViewChild('dialogContinueStory') dialogContinueStory!: ElementRef;
  @ViewChild('dialogStoryNotFound') dialogStoryNotFound!: ElementRef;
  
  constructor() {
    // check local storage for current player, current story
    this.retrievedAuthorId.set(localStorage.getItem(LocalStorage.UserId)!);
    this.retrievedAuthorName.set(localStorage.getItem(LocalStorage.UserName)!);
    this.retrievedStoryId.set(localStorage.getItem(LocalStorage.CurrentStoryId)!);

    if (this.retrievedStoryId()) {
      this.apiService.getStory(this.retrievedStoryId()).subscribe({
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
    this.removeAuthorFromStoryByName(this.retrievedStoryId(), this.retrievedAuthorName());
    localStorage.removeItem(LocalStorage.CurrentStoryId);
    this.closeContinueStoryDialog();
    this.router.navigateByUrl("/");
  }

  disconnect() {
    console.log("reached disconnect with retrievedStoryId:", this.retrievedStoryId());
    if (this.retrievedStoryId()){
      this.removeAuthorFromStoryByName(this.retrievedStoryId(), this.retrievedAuthorName());
0    }
    localStorage.removeItem(LocalStorage.UserName);
    this.dialogStoryNotFound.nativeElement.close();
    this.dialogContinueStory.nativeElement.close();
    this.router.navigateByUrl("/");
  }

  removeAuthorFromStoryByName(storyId: string, authorName: string){
    this.apiService.leaveStory(storyId, authorName).subscribe({
      next: () => {
        // nothing to do here - updated story will be retrieved on stories/{id} page
      },
      error: (err) => {
        console.log("Error removing author from the story:", err);
      }
    });
  }
}
