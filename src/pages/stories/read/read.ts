import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../../services/api-service';
import { LocalStorage, Story } from '../../../types';
import { AuthorListPipe } from '../../../core/author-list-pipe';
import { TitleBlock } from '../../../components/title-block/title-block';
import { RouterLink, Router } from '@angular/router';
import { ActionBar } from "../../../components/actionbar/actionbar";
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-read',
  imports: [TitleBlock, ActionBar, FormsModule, AuthorListPipe],
  templateUrl: './read.html',
  styleUrl: './read.css'
})
export class Read {
  protected readonly router = inject(Router);
  protected readonly apiService = inject(ApiService);
  protected retrievedStories = signal<Story[]>([]);

  getStories() {
    this.apiService.getCompletedStories().subscribe({
      next: (stories: Story[]) => {
        this.retrievedStories.set(stories);
      },
      error: (err) => {
        console.log("Error retrieving stories:", err);
      }
    });
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
