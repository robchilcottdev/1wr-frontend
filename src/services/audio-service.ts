import { Injectable } from '@angular/core';
import { AudioFile } from '../types';

/// Sine octaves up beep.wav by Mossy4 -- https://freesound.org/s/263124/ -- License: Attribution 4.0
/// Toy Electronic Typewriter Return Lever by sprinkleCipher -- https://freesound.org/s/752753/ -- License: Creative Commons 0

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  playSound(audioFile: AudioFile) {
    const audio = new Audio(`assets/audio/${audioFile}`);
    audio.play().catch(error => console.error("Error playing audio:", error));
  }
}
