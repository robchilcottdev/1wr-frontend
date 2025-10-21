import { Injectable } from '@angular/core';
import { AudioFile } from '../types';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  playSound(audioFile: AudioFile) {
    const audio = new Audio(`/audio/${audioFile}`);
    audio.play().catch(error => console.error("Error playing audio:", error));
  }
}
