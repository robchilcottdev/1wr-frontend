import { Component, ElementRef, inject, signal, ViewChild, AfterViewInit, computed } from '@angular/core';
import { TitleBlock } from "../../components/title-block/title-block";
import { ApiService } from '../../services/api-service';
import { SocketService } from '../../services/socket-service';
import { AudioService } from '../../services/audio-service';
import { AudioFile, LocalStorage, SocketMessageType, Story, StoryState, VoteType, DisplayedVote, VotingScheme } from '../../types';
import { AuthorListPipe } from '../../core/author-list-pipe';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RestrictStoryword } from "../../core/restrict-storyword-directive";

@Component({
  selector: 'app-stories',
  imports: [TitleBlock, FormsModule, AuthorListPipe, RestrictStoryword, RouterLink],
  templateUrl: './stories.html',
  styleUrl: './stories.css'
})

export class Stories implements AfterViewInit {
  @ViewChild('dialogEnterName') dialogEnterName!: ElementRef;
  @ViewChild('dialogLeave') dialogLeave!: ElementRef;
  @ViewChild('dialogVote') dialogVote!: ElementRef;
  @ViewChild('dialogError') dialogError!: ElementRef;
  @ViewChild('storyBodyText') storyBodyText!: ElementRef;
  @ViewChild('endOfStoryBodyText') endOfStoryBodyText!: ElementRef;
  @ViewChild('lastWord') lastWord!: ElementRef;

  // #region variables
  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  protected readonly apiService = inject(ApiService);
  protected readonly socketService = inject(SocketService);
  protected readonly audioService = inject(AudioService);

  protected storyId = localStorage.getItem(LocalStorage.CurrentStoryId) ??
                      this.route.snapshot.paramMap.get("id");

  protected retrievedStory = signal<Story | null>(null);
  protected authorName = signal(""); // this author's name, entered upon joining the story
  protected authorNameConfirmed = signal(false);
  public messages = signal("");
  protected showAuthorNameClashMessage = signal(false);
  protected showAuthorNameInvalid = signal(false);
  protected wordToAdd = signal("");

  protected voteSummary = signal<Array<DisplayedVote> | null>(null);
  protected voteOutcome = signal("");
  protected storyEnded = signal(false);

  protected errorDialogText = signal("");
  protected allowNavigateAway = signal(false);

  protected countdownTimerMax = signal(0);
  protected countdownTimer = signal(0);
  protected intervalId = signal<number | null>(null);
  protected countdownTimerInitialized = signal<boolean>(false);
  //#endregion

  //#region computed signals
  protected thisAuthorIsCreator = computed(() => {
    const creator = this.retrievedStory()!.authors.find(a => a.isCreator);
    return creator?.name === this.authorName();
  });

  protected creatorName = computed(() => {
    if (this.retrievedStory()!.authors.length === 0) return "";
    const creator = this.retrievedStory()!.authors.find(a => a.isCreator);
    return creator?.name;
  });

  protected isThisAuthorsTurn = computed(() => {
    if (this.retrievedStory()!.authors.length < 2) return false;
    const authorTurnIndex = this.retrievedStory()!.authorTurn;
    const currentTurnAuthor = this.retrievedStory()!.authors[authorTurnIndex];
    const thisAuthorId = localStorage.getItem(LocalStorage.UserId);

    return currentTurnAuthor.id === thisAuthorId;
  });

  protected currentAuthorTurnName = computed(() => {
    if (this.retrievedStory() == null) return "";
    if (this.retrievedStory()!.authors.length === 0) return "";
    const authorTurnIndex = this.retrievedStory()!.authorTurn;
    const currentTurnAuthor = this.retrievedStory()!.authors[authorTurnIndex];

    return currentTurnAuthor.name;
  });

  protected hasAtLeastOneAuthor = computed(() => {
    if (this.retrievedStory()){
      return this.retrievedStory()!.authors.length > 0;
    }
    return false;
  });

  protected hasLessThanTwoAuthors = computed(() => {
    if (this.retrievedStory()){
      return this.retrievedStory()!.authors.length < 2;
    }
    return true;
  });

  protected wordLimitReached = computed(() => {
    return this.retrievedStory()?.words.length === this.retrievedStory()?.wordLimit;
  });

  protected stateAwaitingAuthors = computed(() => this.retrievedStory()?.state === StoryState.AwaitingAuthors) ?? StoryState.AwaitingAuthors;
  protected stateInProgress = computed(() => this.retrievedStory()?.state === StoryState.InProgress) ?? StoryState.AwaitingAuthors;

  protected voteProposedBy = computed(() => {
    return this.retrievedStory()?.voteDetails?.voteProposedBy ?? "";
  });

  protected voteIsActive = computed(() => { return this.retrievedStory()?.voteDetails?.voteIsActive });

  protected hasVoted = computed(() => {
    return this.retrievedStory()?.voteDetails?.votes?.some(v => v.authorName === this.authorName());
  });

  protected voteType = computed(() => {
    const voteType = this.retrievedStory()?.voteDetails?.voteType;
    if (voteType === VoteType.EditWord) {
      return "edit the last word";
    } else if (voteType === VoteType.EndStory) {
      return "end the story";
    } else {
      return "voteType unspecified";
    }
  });

  //#endregion

  // handles raising messages for the ui from the websocket server,
  // then gets the updated story
  // #region sockets
  initializeSocket() {
    const socket: WebSocket = this.socketService.socket;
    socket.addEventListener("message", (event: any) => {
      const message = JSON.parse(event.data);
      console.info(`${new Date().toUTCString()} - Socket message received: ${message.type} | ${JSON.stringify(message)}`);              
      switch (message.type) {
        case SocketMessageType.WordAdded:
          this.messages.set(`${message.author} added '${message.word.replace("\\", "")}' to the story. 
          ${message.nextAuthor}, it's your turn.`);
          this.getStory();
          break;
        case SocketMessageType.SkippedTurn:
        case SocketMessageType.ClientCountdownTimerExpired:
          this.messages.set(`${message.author} passed or ran out of time!`);
          let mySound = new Audio("/assets/audio/" + AudioFile.SkipTurnBeep);
          mySound.volume = 0.5;            
          mySound.play();
          this.getStory();          
          break;
        case SocketMessageType.AuthorJoined:
          this.getStory();          
          this.messages.set(`${message.author} joined the story.`);
          break;
        case SocketMessageType.AuthorLeft:
        case SocketMessageType.UserDisconnected:
          this.getStory();          
          this.messages.set(`${message.author} left the story.`);
          break;
        case SocketMessageType.StateChanged:
        case SocketMessageType.VoteStarted:
        case SocketMessageType.VoteMade:
        case SocketMessageType.VoteEnded:
          this.getStory();
          break;
        case SocketMessageType.ClientVoteOutcomeMessage:
          this.voteOutcome.set(message.data);
          break;
        default:
          break;
      }
    });
  }
  // #endregion

  // Retrieves the latest data for the story and acts on any changes.
  // Triggered on initial component load, then after every message from
  // the websocket server
  async getStory() {
    const storyId = localStorage.getItem(LocalStorage.CurrentStoryId) ?? this.storyId;
    if (storyId) {
      const previousStoryState = this.retrievedStory()?.state ?? StoryState.AwaitingAuthors;
      const previousWordCount = this.retrievedStory()?.words.length;

      this.apiService.getStory(storyId).subscribe({
        next: (story: Story) => { 
          if (!this.countdownTimerInitialized()) {
            this.countdownTimerMax.set(story.timeLimit);
            this.countdownTimer.set(story.timeLimit);
            this.countdownTimerInitialized.set(true);
          }

          this.retrievedStory.set(story);

          let flashNewWord = false;
          if(previousWordCount && previousWordCount != story.words.length) {
            flashNewWord = true;
          }
          this.scrollToBottom(flashNewWord);

          // if a time limit per turn has been set, reset it and start it counting down
          if (this.countdownTimerMax() > 0) {
            this.resetCountdownTimer();
            this.triggerCountdown();
          }
          
          if (!this.authorNameConfirmed()){
            // if author name in local storage, pre-populate the enter name dialog
            if (localStorage.getItem(LocalStorage.UserName)) {
              this.authorName.set(localStorage.getItem(LocalStorage.UserName)!);
            }
            this.dialogEnterName.nativeElement.showModal();
          }

          if (story.state != previousStoryState && story.state === StoryState.Completed) {
            // TODO: persist story to data layer
            this.storyEnded.set(true);
            this.messages.set("Thanks for writing!");
            localStorage.removeItem(LocalStorage.CurrentStoryId);
          }

          if (story.state != previousStoryState && this.stateInProgress() && story.authors.length > 1) {
            this.messages.set(`${this.currentAuthorTurnName()}, it's your turn.`);
          }
          if (story.authors.length < 2) {
            if (this.countdownTimerMax() > 0) this.resetCountdownTimer();
            this.messages.set(this.messages() + " Waiting for 2 or more authors.");
          }

          // handle voting
          if (this.voteIsActive()) this.processVote(story);
        },
        error: (err) => {
          console.log("Error retrieving story:", err);
          this.dialogEnterName.nativeElement.close();
        }
      });
    } else {
      this.messages.set("Story not found.");
    }
  }

  joinStory() {
    // validation
    if (!this.retrievedStory()) return;
    if (this.retrievedStory()!.authors.some(a => a.name === this.authorName())) {
      this.showAuthorNameClashMessage.set(true);
      return;
    }
    if (this.authorName().length < 1 || this.authorName().length > 10) {
      this.showAuthorNameInvalid.set(true);
      return;
    }
    this.dialogEnterName.nativeElement.close();

    const authorId = localStorage.getItem(LocalStorage.UserId)!;

    this.apiService.joinStory(this.storyId!, authorId, this.authorName()).subscribe({
      next: (story: Story) => {
        this.authorNameConfirmed.set(true);
      },
      error: (err) => {
        console.log("Error joining story:", err);
      }
    })

    // for convenience and recovery from disconnects, stash the user name and current storyId
    // in browser storage
    localStorage.setItem(LocalStorage.UserName, this.authorName());
    localStorage.setItem(LocalStorage.CurrentStoryId, this.storyId!);
  }

  closeEnterNameDialog() {
    this.dialogEnterName.nativeElement.close();
    this.router.navigateByUrl("/");
  }

  // guard applied only to this route to disable back button, but allow programmatic navigation
  canDeactivate(): boolean {
    if(this.allowNavigateAway()) return true;
    this.leave();
    return false;
  }

  leave() {
    if (!this.retrievedStory() || this.retrievedStory()!.state === StoryState.Completed) {
      // no story, or story is over - straight home you go
      this.allowNavigateAway.set(true);      
      this.router.navigateByUrl("/");
    }

    // are you really sure you want to leave?
    this.dialogLeave.nativeElement.showModal();
  }

  confirmLeaveStory() {
    const storyId = this.storyId!;
    const authorName = localStorage.getItem(LocalStorage.UserName)!;

    this.apiService.leaveStory(storyId, authorName).subscribe({
      next: (story: Story) => {
        this.dialogLeave.nativeElement.close();
        this.allowNavigateAway.set(true);        
        this.router.navigateByUrl("/");
      },
      error: (err) => {
        console.log("Error leaving story:", err);
        // the story is probably long gone, leave anyway
        this.dialogLeave.nativeElement.close();
        this.router.navigateByUrl("/");
      }
    })
  }

  beginStory() {
    this.apiService.updateStoryState(this.storyId!, StoryState.InProgress).subscribe({
      next: (story: Story) => {
        this.messages.set(`${story.authors[story.authorTurn].name}, it's your turn`);
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
      this.wordToAdd.set("");
      return;
    }
    this.apiService.addWord(this.storyId!, this.wordToAdd(), this.authorName()).subscribe({
      next: (story: Story) => {
        // TODO: flash the latest word somehow?
      },
      error: (err) => {
        this.messages.set("Error adding word");
      },
      complete: () => {
        this.wordToAdd.set("");
      }
    });
  }

  voteToEnd() {
    if (this.authorName() === this.retrievedStory()!.voteDetails?.previousVoteProposedBy){
      this.errorDialogText.set("Multiple consecutive votes are not allowed. Give someone else a chance!");
      this.dialogError.nativeElement.showModal();
      return;
    }
    this.apiService.proposeVote(this.storyId!, VoteType.EndStory, this.authorName()).subscribe({    
      error: (err) => {
        this.messages.set("Error starting vote");
      }
    });
  }

  voteToEdit() {
    if (this.authorName() === this.retrievedStory()!.voteDetails?.previousVoteProposedBy){
      this.errorDialogText.set("Multiple consecutive votes are not allowed. Give someone else a chance!");
      this.dialogError.nativeElement.showModal();
      return;
    }
    this.apiService.proposeVote(this.storyId!, VoteType.EditWord, this.authorName()).subscribe({    
      error: (err) => {
        this.messages.set("Error starting vote");
      }
    });
  }

  makeVote(vote: boolean) {
    this.apiService.makeVote(this.storyId!, vote, this.authorName()).subscribe({
      error: (err) => {
        this.messages.set("Error making vote");
      }
    });
  }

  processVote(story: Story): void {
    if (this.countdownTimerMax() > 0) this.resetCountdownTimer();

    // populate and show the voting dialog
    let voteSummary: Array<DisplayedVote> = [];

    // build list of those who've voted so far
    story.voteDetails!.votes!.forEach(vote => {
      voteSummary.push({ authorName: vote.authorName, voteForDisplay: vote.vote });
    });

    // and append those who've yet to vote
    story.authors.forEach(author => {
      if (!story.voteDetails!.votes!.some(v => v.authorName === author.name)) {
        voteSummary.push({ authorName: author.name, voteForDisplay: null });
      }
    });

    this.voteSummary.set(voteSummary);

    this.dialogVote.nativeElement.showModal();

    // resolve / administer voting state
    const yesVotes = this.retrievedStory()!.voteDetails!.votes!.filter(v => v.vote === true).length;
    const noVotes = this.retrievedStory()!.voteDetails!.votes!.filter(v => v.vote === false).length;
    const eligibleVoters = this.retrievedStory()!.authors.length;

    // determine outcome
    // for now, voting scheme is always Majority
    if (this.retrievedStory()!.votingScheme === VotingScheme.Majority) {
      if (yesVotes > (eligibleVoters / 2)) {
        this.broadcastVoteOutcome("The majority agreed to " + this.voteType());        
        this.concludeVote(true);        
      } else if (noVotes > (eligibleVoters / 2)) {
        this.broadcastVoteOutcome("The majority chose not to " + this.voteType());
        this.concludeVote(false);    
      } else if (yesVotes + noVotes === eligibleVoters){
        // everyone has voted, and still no resolution
        this.broadcastVoteOutcome("A majority has not agreed to " + this.voteType());
        this.concludeVote(false);
      }
    }
  }

  broadcastVoteOutcome(message: string){
    this.socketService.socket.send(JSON.stringify({ 
      type: SocketMessageType.ClientVoteOutcome,
      storyId: this.storyId,
      message: message
    }));
  }

  // show the vote outcome - the consequence of the vote is handled by getStory, triggered by socket message
  concludeVote(voteCarried: boolean) {
    this.apiService.concludeVote(this.storyId!, voteCarried).subscribe({
      error: (err) => {
        console.log("Error concluding vote:", err);
        this.messages.set("There was an error resetting the vote.");
      }
    });
  }

  closeVoteDialog(){
    this.dialogVote.nativeElement.close()
    this.voteSummary.set([]);
    this.voteOutcome.set("");
  }

  triggerCountdown(){    
    this.countdownTimer.set(this.countdownTimerMax());
    this.intervalId.set(setInterval(()=> {
      this.countdownTimer.set(this.countdownTimer() - 1);
      if (this.countdownTimer() === 0) {
        if (this.isThisAuthorsTurn()){
          this.apiService.skipTurn(localStorage.getItem(LocalStorage.CurrentStoryId)!, this.authorName()).subscribe({
            error: (err) => {
              console.log("Error processing countdownTimer reaching 0:", err);
            }
          });
        }
      }
    }, 1000));
  }

  resetCountdownTimer(){
    if (this.intervalId()) clearInterval(this.intervalId()!);
    this.countdownTimer.set(this.countdownTimerMax());
  }

  scrollToBottom(flashNewWord: boolean) {
    setTimeout(() => {
      this.endOfStoryBodyText.nativeElement.scrollIntoView({ behavior: 'smooth' });
      if (flashNewWord) {
        this.flashFinalWord();
        let mySound = new Audio("/assets/audio/" + AudioFile.TypewriterKeystroke);
        mySound.volume = 0.5;
        mySound.play();
      }
    }, 100);
  }

  flashFinalWord() {
    if (this.lastWord){
      this.lastWord.nativeElement.classList.add("bg-yellow-300", "border", "border-black");      
      setTimeout(() => {
        this.lastWord.nativeElement.classList.remove("bg-yellow-300", "border", "border-black");
      }, 500);
    }
  }

  constructor() {
    this.initializeSocket();
    this.messages.set("");
  }

  ngAfterViewInit(): void {
    this.countdownTimerInitialized.set(false);
    this.getStory();
  }
}
