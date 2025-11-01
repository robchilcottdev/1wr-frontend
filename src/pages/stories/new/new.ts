import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, computed } from '@angular/core';
import { TitleBlock } from "../../../components/title-block/title-block";
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api-service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActionBar } from "../../../components/actionbar/actionbar";
import { LocalStorage, NewStoryDto, Story } from '../../../types';

@Component({
  selector: 'app-new',
  imports: [TitleBlock, ReactiveFormsModule, ActionBar],
  templateUrl: './new.html',
  styleUrl: './new.css'
})
export class New implements AfterViewInit {
  
  protected router = inject(Router);
  protected readonly apiService = inject(ApiService);
  private formBuilder = inject(FormBuilder);

  protected alertMessage = signal("");
  
  private openingTexts: Array<string> = [
    "Once upon a time,",
    "A long time ago,",
    "One day,",
    "The night was humid.",
    "In a distant galaxy, "];

  protected genres: Array<string> = ["General Fiction", "Crime", "Fantasy", "Historical", "Horror", "Kids", "Romance", "Sci-fi", "Thriller"];
  protected wordLimits: Array<number> = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];    

  @ViewChild('inputTitle') inputTitle!: ElementRef;

  newStoryForm = this.formBuilder.group({
    storyTitle: ["", [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    wordLimit: [50, [Validators.min(50), Validators.max(1000)]],
    openingText: [this.getOpeningText()],
    genre: ["General Fiction"]
  });

  get storyTitle() { return this.newStoryForm.get('storyTitle'); }
  get wordLimit() { return this.newStoryForm.get('wordLimit'); }
  
  ngAfterViewInit(): void {
    this.inputTitle.nativeElement.focus();
  }

  handleBeginStory(): void {
    
    const newStoryDto: NewStoryDto = {
      title: this.newStoryForm.value.storyTitle!,
      genre: this.newStoryForm.value.genre!,
      openingText: this.newStoryForm.value.openingText ?? undefined,
      wordLimit: this.newStoryForm.value.wordLimit!
    };

      this.apiService.addStory(newStoryDto).subscribe({
          next: (story) => {
            if (story && story.storyId) {
              localStorage.setItem(LocalStorage.CurrentStoryId, story.storyId);
              this.router.navigateByUrl(`/stories/${story.storyId}`);
            }
          },
          error: (err) => {
            this.alertMessage.set('Error creating story: ' + JSON.stringify(err));
          }
        });
  }

  getOpeningText(): string {
    return this.getRandomValueFromArray(this.openingTexts);
  }

  randomizer($event: PointerEvent): void {
    $event.preventDefault();
    this.newStoryForm.patchValue({ 
      openingText: this.getRandomValueFromArray(this.openingTexts),
      genre: this.getRandomValueFromArray(this.genres),
      wordLimit: this.getRandomValueFromArray(this.wordLimits)
    });
  }

  getRandomValueFromArray(array: Array<any>){
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  }

}

