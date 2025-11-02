import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../../services/api-service';
import { LocalStorage, Story } from '../../../types';
import { AuthorListPipe } from '../../../core/author-list-pipe';
import { TitleBlock } from '../../../components/title-block/title-block';
import { RouterLink, Router } from '@angular/router';
import { Dock } from "../../../components/dock/dock";
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-open',
  imports: [AuthorListPipe, TitleBlock, RouterLink, Dock, FormsModule],
  templateUrl: './open.html',
  styleUrl: './open.css'
})
export class Open {
  protected readonly router = inject(Router);
  protected readonly apiService = inject(ApiService);
  protected retrievedStories = signal<Story[]>([]);
  protected joinByCode = signal("");

  getStories() {
    this.apiService.getStories().subscribe({
      next: (stories: Story[]) => {
        this.retrievedStories.set(stories);
      },
      error: (err) => {
        console.log("Error retrieving stories:", err);
      }
    });
  }

  handleJoinStory(storyId: string) {
    localStorage.setItem(LocalStorage.CurrentStoryId, storyId);
    this.router.navigateByUrl(`/stories/${storyId}`);
  }

  handleJoinByCode(){
    localStorage.setItem(LocalStorage.CurrentStoryId, this.joinByCode());
    this.router.navigateByUrl(`/stories/${this.joinByCode()}`);
  }

  handleRefresh($event: Event)
  {
    $event.preventDefault();
    this.retrievedStories.set([]);
    this.getStories();
  }

  constructor() {
    this.getStories();
  }
}
