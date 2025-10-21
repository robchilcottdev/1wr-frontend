import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../../services/api-service';
import { LocalStorage, Story } from '../../../types';
import { AuthorListPipe } from '../../../core/author-list-pipe';
import { TitleBlock } from '../../../components/title-block/title-block';
import { RouterLink, Router } from '@angular/router';
import { ActionBar } from "../../../components/actionbar/actionbar";

@Component({
  selector: 'app-open',
  imports: [AuthorListPipe, TitleBlock, RouterLink, ActionBar],
  templateUrl: './open.html',
  styleUrl: './open.css'
})
export class Open {
  protected readonly router = inject(Router);
  protected readonly apiService = inject(ApiService);
  protected retrievedStories = signal<Story[]>([]);

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

  joinStory(storyId: string) {
    localStorage.setItem(LocalStorage.CurrentStoryId, storyId);
    this.router.navigateByUrl(`/stories/${storyId}`);
  }

  refresh($event: Event)
  {
    $event.preventDefault();
    this.retrievedStories.set([]);
    this.getStories();
  }

  constructor() {
    this.getStories();
  }
}
