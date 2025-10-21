import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { TitleBlock } from "../../../components/title-block/title-block";
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api-service';
import { FormsModule } from '@angular/forms';
import { ActionBar } from "../../../components/actionbar/actionbar";
import { LocalStorage } from '../../../types';

@Component({
  selector: 'app-new',
  imports: [TitleBlock, FormsModule, ActionBar],
  templateUrl: './new.html',
  styleUrl: './new.css'
})
export class New implements AfterViewInit {
  protected router = inject(Router);
  protected readonly apiService = inject(ApiService);
  @ViewChild('inputTitle') inputTitle!: ElementRef;

  // form fields
  protected storyTitle = signal("");
  protected alertMessage = signal("");

  handleBeginStory($event: any): void {
    $event.preventDefault();

    if (this.storyTitle()) {
      this.apiService.addStory(this.storyTitle()).subscribe({
          next: (story) => {
            if (story && story.storyId) {
              localStorage.setItem(LocalStorage.CurrentStoryId, story.storyId);
              this.router.navigateByUrl(`/stories/${story.storyId}`);
            }
          },
          error: (err) => {
            this.alertMessage.set('Error creating story: ' + err);
          }
        });
    } else {
      this.alertMessage.set("Story title is required.");
    }
  }

  ngAfterViewInit(): void {
    this.inputTitle.nativeElement.focus();
  }
  
}
