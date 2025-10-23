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
  protected retrievedStory = signal<Story | undefined>(undefined);
  protected retrievedAuthorId = signal("");
  protected retrievedAuthorName = signal("");
  protected showNameClash = signal(false);
  
  @ViewChild('dialogContinueStory') dialogContinueStory!: ElementRef;
  @ViewChild('dialogStoryNotFound') dialogStoryNotFound!: ElementRef;
  
  constructor() {
    // check local storage for current player, current story
    this.retrievedAuthorId.set(localStorage.getItem(LocalStorage.UserId)!);
    this.retrievedAuthorName.set(localStorage.getItem(LocalStorage.UserName)!);
    this.retrievedStoryId.set(localStorage.getItem(LocalStorage.CurrentStoryId)!);

    if (this.retrievedStoryId() && this.retrievedAuthorName()) {
      this.apiService.getStory(this.retrievedStoryId()).subscribe({
        next: (story: Story) => {
          this.retrievedStory.set(story);
          this.retrievedStoryTitle.set(story.title);
          this.continueStory();
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

  closeContinueStoryDialog() { this.dialogContinueStory.nativeElement.close(); }

  continueStory() {
    this.dialogContinueStory.nativeElement.showModal();
    if (this.retrievedStory()!.authors.some(a => a.name === this.retrievedAuthorName())){
      this.showNameClash.set(true);
      return;
    }
    this.closeContinueStoryDialog();
    this.router.navigateByUrl("/stories/" + localStorage.getItem(LocalStorage.CurrentStoryId));
  }

  joinWithNewName() {
    localStorage.removeItem(LocalStorage.UserName);
    this.retrievedAuthorName.set("");
    this.continueStory();
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
