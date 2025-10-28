import { Component, input, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LocalStorage, Story } from '../types';
import { ApiService } from '../services/api-service';
import { SocketService } from '../services/socket-service';

@Component({
  selector: 'app-global-modals',
  imports: [],
  templateUrl: './global-modals.html'
})
export class GlobalModals {
  protected readonly router = inject(Router);
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly apiService = inject(ApiService);
  protected readonly socketService = inject(SocketService);

  protected retrievedStoryTitle = signal("");
  protected retrievedStoryId = signal("");
  protected retrievedStory = signal<Story | undefined>(undefined);
  protected retrievedAuthorId = signal("");
  protected retrievedAuthorName = signal("");

  connectionCountdownMax = input<number>(0);
  connectionCountdown = input<number>(0);

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
          if (!location.href.includes("stories/")){
            this.retrievedStory.set(story);
            this.retrievedStoryTitle.set(story.title);
            this.dialogContinueStory.nativeElement.showModal();
          } else {
            this.router.navigateByUrl("/stories/" + localStorage.getItem(LocalStorage.CurrentStoryId));
          }
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
    localStorage.removeItem(LocalStorage.UserName);
    this.dialogContinueStory.nativeElement.showModal();
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

