import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User, Story, Author, VoteDetails, LocalStorage, StoryState } from '../types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = 'http://localhost:3000';

  addStory(title: string) : Observable<Story> {    
    return this.http.post<Story> (`${this.baseUrl}/story/add`, { authorId: localStorage.getItem(LocalStorage.UserId)!, title });
  }

  getStory(storyId: string): Observable<Story> {
    return this.http.get<Story>(`${this.baseUrl}/story/${storyId}`);
  }

  getStories(): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.baseUrl}/stories`);
  }

  addWord(storyId: string, word: string, authorName: string): Observable<Story> {
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/addword`, { word: word, authorName: authorName});
  }

  joinStory(storyId: string, authorId: string, authorName: string){
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/join`, { authorId, authorName });
  }

  leaveStory(storyId: string, authorId: string, authorName: string) {
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/leave`, { authorId, authorName });
  }

  updateStoryState(storyId: string, state: StoryState){
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/state`, { state });
  }

  resetAll(){
    return this.http.get(`${this.baseUrl}/resetAll`);
  }

}
