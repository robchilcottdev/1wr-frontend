import { Component, ElementRef, inject, signal, ViewChild, AfterViewInit, afterEveryRender, computed, effect } from '@angular/core';
import { TitleBlock } from "../../components/title-block/title-block";
import { ApiService } from '../../services/api-service';
import { AudioFile, LocalStorage, SocketMessageType, Story, StoryState } from '../../types';
import { AuthorListPipe } from '../../core/author-list-pipe';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket-service';
import { RestrictStoryword } from "../../core/restrict-storyword-directive";
import { AudioService } from '../../services/audio-service';

@Component({
  selector: 'app-stories',
  imports: [TitleBlock, FormsModule, AuthorListPipe, RestrictStoryword],
  templateUrl: './stories.html',
  styleUrl: './stories.css'
})

export class Stories implements AfterViewInit {
  @ViewChild('dialogEnterName') dialogEnterName!: ElementRef;
  @ViewChild('dialogLeave') dialogLeave!: ElementRef;
  @ViewChild('storyBodyText') storyBodyText!: ElementRef;

  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  protected readonly apiService = inject(ApiService);
  protected readonly socketService = inject(SocketService);
  protected readonly audioService = inject(AudioService);

  protected storyId = this.route.snapshot.paramMap.get("id");
  protected retrievedStory = signal<Story | null>(null);
  
  public messages = signal("");

  protected authorName = signal("");
  protected showAuthorNameClashMessage = signal(false);
  protected showAuthorNameInvalid = signal(false);
  protected authorNameConfirmed = signal(false);
  protected stateAwaitingAuthors = signal(false);
  protected stateInProgress = signal(false);

  protected wordToAdd = signal("");

  // COMPUTED
  protected thisAuthorIsCreator = computed(() => {
    const creator = this.retrievedStory()!.authors.find(a => a.isCreator);
    return creator?.id === localStorage.getItem(LocalStorage.UserId);
  });

  protected creatorName = computed(() => {
    if (this.retrievedStory()!.authors.length === 0) return "";
    const creator = this.retrievedStory()!.authors.find(a => a.isCreator);
    return creator?.name;
  });

  protected isThisAuthorsTurn = computed (() => {
    if (this.retrievedStory()!.authors.length === 0) return false;
    const authorTurnIndex = this.retrievedStory()!.authorTurn;
    const currentTurnAuthor = this.retrievedStory()!.authors[authorTurnIndex];
    const thisAuthorId = localStorage.getItem(LocalStorage.UserId);

    return currentTurnAuthor.id === thisAuthorId;
  });

  protected currentAuthorTurnName = computed (() => {
    if (this.retrievedStory()!.authors.length === 0) return "";
    const authorTurnIndex = this.retrievedStory()!.authorTurn;
    const currentTurnAuthor = this.retrievedStory()!.authors[authorTurnIndex];

    return currentTurnAuthor.name;
  });

initializeSocket(){
    const socket: WebSocket = this.socketService.socket;
    socket.addEventListener("message", (event: any) => {
      const message = JSON.parse(event.data);
      this.logSocketMessage(message);
      switch (message.type) {      
        case SocketMessageType.WordAdded:
          let messageString = `${message.author} added '${message.word.replace("\\", "")}' to the story. ${message.nextAuthor}, it's your turn.`;          
          this.messages.set(messageString);
          this.audioService.playSound(AudioFile.TypewriterKeystroke);     
          this.getStory();
          break;
          case SocketMessageType.AuthorJoined:
          this.getStory();
          this.messages.set(`${message.author} joined the story.`);
          break;
        case SocketMessageType.AuthorLeft:
          this.getStory();
          this.messages.set(`${message.author} left the story.`);
          break;
        case SocketMessageType.StateChanged:
          this.getStory();
          break;          
        default: // for currently unhandled socket message types
          break;
      }  
    });
  }

  getStory() {
    const previousStoryState = this.retrievedStory()?.state ?? StoryState.AwaitingAuthors;
    const previousAuthorCount = this.retrievedStory()?.authors?.length ?? 0;
    if (this.storyId) {
      this.apiService.getStory(this.storyId).subscribe({
        next: (story: Story) => {
          this.retrievedStory.set(story);
          if (story.state != previousStoryState && story.state === StoryState.InProgress) {
            this.messages.set(`${this.currentAuthorTurnName()}, add the next word.`);
          } 
          if (story.authors.length < 2) this.messages.set("Awaiting minimum of two authors...");
          if (story.authors.length >= 2 && previousAuthorCount < 2){
            this.messages.set(`Waiting for ${this.creatorName()} to start the story.`);
          }
          
          this.stateAwaitingAuthors.set(story.state === StoryState.AwaitingAuthors);
          this.stateInProgress.set(story.state === StoryState.InProgress);
          
          console.log("Latest story:", story);
        },
        error: (err) => {
          console.log("Error retrieving story:", err);
          this.messages.set("Error retrieving story. Try reloading the page.");
        }
      });
    } else {
      this.messages.set("Story not found.");
    }
  }

  joinStory(skipNameCheck: boolean = false) {
    if (!skipNameCheck){
      if (this.authorName().length < 3 || this.authorName().length > 10){
        this.showAuthorNameInvalid.set(true);
        return;
      }
      if (this.retrievedStory()!.authors.some(a => a.name === this.authorName())){
        this.showAuthorNameClashMessage.set(true);
        return;
      }

    }
    
    localStorage.setItem(LocalStorage.UserName, this.authorName());
    localStorage.setItem(LocalStorage.CurrentStoryId, this.storyId!);

    const storyId = localStorage.getItem(LocalStorage.CurrentStoryId)!;
    const authorId = localStorage.getItem(LocalStorage.UserId)!;
    const authorName = localStorage.getItem(LocalStorage.UserName)!;

    this.dialogEnterName.nativeElement.close();

    this.apiService.joinStory(storyId, authorId, authorName).subscribe({
      next: (story: Story) => {
        this.retrievedStory.set(story);
        this.authorNameConfirmed.set(true);
      },
      error: (err) => {
        console.log("Error joining story:", err);
      }
    })
  }

  closeEnterNameDialog() {
    this.dialogEnterName.nativeElement.close();
    this.router.navigateByUrl("/");
  }

  leave(){
    this.dialogLeave.nativeElement.showModal();
  }

  confirmLeaveStory(){
    const storyId = this.storyId!;
    const authorId = localStorage.getItem(LocalStorage.UserId)!;
    const authorName = localStorage.getItem(LocalStorage.UserName)!;

    this.apiService.leaveStory(storyId, authorId, authorName).subscribe({
      next: (story: Story) => {
        this.dialogLeave.nativeElement.close();
        this.router.navigateByUrl("/");
      },
      error: (err) => {
        console.log("Error leaving story:", err);
        this.dialogLeave.nativeElement.close();
        this.router.navigateByUrl("/");
      }
    })
  }

  beginStory(){
    this.apiService.updateStoryState(this.storyId!, StoryState.InProgress).subscribe({
      next: (story: Story) => {
        this.messages.set(`${story.authors[story.authorTurn].name}, it's your turn`);
        this.getStory();
      },
      error: (err) => {
        console.log("Error beginning story:", err);
        this.messages.set("Error starting story");
      }
    });
  }

  addWord() {
    if (!this.wordToAdd()) {
      this.messages.set("No passes allowed! (Yet.) Please add a word.");
      return;
    }

    if (this.wordToAdd().length > 20) {
      this.messages.set("So you like big words? 20 characters should be more than enough!");
      this.wordToAdd.set(this.wordToAdd().slice(0, 19));
      return;
    }
    this.apiService.addWord(this.storyId!, this.wordToAdd(), localStorage.getItem(LocalStorage.UserName)!).subscribe({
      next: (story: Story) => {
        this.retrievedStory.set(story);
        // flash the latest word somehow?
      },
      error: (err) => {
        this.messages.set("Error adding word");
      },
      complete: () => {
        this.wordToAdd.set("");
      }
    });
  }

  logSocketMessage(message: any){
    console.log(`${new Date().toUTCString()} - Socket message received: ${message.type}`)
  }

  constructor() {
    this.initializeSocket();
    this.messages.set("");
    this.getStory();

    afterEveryRender(() => {
    });
  }

  ngAfterViewInit(): void {
    // check if this user already has a name, and if so skip the welcome dialog
    if (localStorage.getItem(LocalStorage.UserName)){
      this.authorName.set(localStorage.getItem(LocalStorage.UserName)!);
      this.joinStory(true);
    } else {
      this.dialogEnterName.nativeElement.showModal();
    }
  }
}
