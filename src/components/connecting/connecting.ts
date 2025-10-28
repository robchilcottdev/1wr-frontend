import { Component, computed } from '@angular/core';
import { TitleBlock } from "../title-block/title-block";

@Component({
  selector: 'app-connecting',
  imports: [TitleBlock],
  templateUrl: './connecting.html',
  styleUrl: './connecting.css'
})
export class Connecting {
  private welcomeMessages: Array<string> = [
    "Be right there", "With you in a tick", "Finding quill, dipping ink", 
    "Readying the manuscript", "Grabbing some paper", "Blotting the ink", "Sharpening the quill",
    "Sharpening the mind", "Sharpening the beak", "Calculating wit"
  ];

  protected randomWelcomeMessage = computed(() => {
    const randomIndex = Math.floor(Math.random() * this.welcomeMessages.length);
    return this.welcomeMessages[randomIndex];
  });
}
