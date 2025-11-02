import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User, Story, Author, VoteDetails, LocalStorage, StoryState, VoteType, NewStoryDto } from '../types';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = environment.apiUrl;

  addStory(newStoryDto: NewStoryDto) : Observable<Story> {    
    return this.http.post<Story> (`${this.baseUrl}/story/add`, newStoryDto);
  }

  getStory(storyId: string): Observable<Story> {
    return this.http.get<Story>(`${this.baseUrl}/story/${storyId}`);
  }

  getStories(): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.baseUrl}/stories`);
  }

  getCompletedStories(): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.baseUrl}/stories/completed`);
  }

  addWord(storyId: string, word: string, authorName: string): Observable<Story> {
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/addword`, { word: word, authorName: authorName});
  }

  skipTurn(storyId: string, authorName: string): Observable<Story> {
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/skipTurn`, { authorName: authorName});
  }

  joinStory(storyId: string, authorId: string, authorName: string){
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/join`, { authorId, authorName });
  }

  leaveStory(storyId: string, authorName: string) {
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/leave`, { authorName });
  }

  updateStoryState(storyId: string, state: StoryState){
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/state`, { state });
  }

  proposeVote(storyId: string, voteType: VoteType, authorName: string){
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/vote/propose`, { voteType, authorName });
  }

  makeVote(storyId: string, vote: boolean, authorName: string){
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/vote/decide`, { vote, authorName });
  }

  concludeVote(storyId: string, voteCarried: boolean){
     return this.http.patch<Story> (`${this.baseUrl}/story/${storyId}/vote/conclude`, { voteCarried });
  }

  resetAll(){
    return this.http.get(`${this.baseUrl}/resetAll`);
  }

}
