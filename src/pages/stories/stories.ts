import { Component, ElementRef, inject, signal, ViewChild, AfterViewInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleBlock } from "../../components/title-block/title-block";
import { ApiService } from '../../services/api-service';
import { AudioFile, LocalStorage, SocketMessageType, Story, StoryState, VoteType, DisplayedVote, VotingScheme } from '../../types';
import { AuthorListPipe } from '../../core/author-list-pipe';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket-service';
import { RestrictStoryword } from "../../core/restrict-storyword-directive";
import { AudioService } from '../../services/audio-service';

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
  @ViewChild('storyBodyText') storyBodyText!: ElementRef;

  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  protected readonly apiService = inject(ApiService);
  protected readonly socketService = inject(SocketService);
  protected readonly audioService = inject(AudioService);

  // storyId taken from url
  protected storyId = localStorage.getItem(LocalStorage.CurrentStoryId);

  protected retrievedStory = signal<Story | null>(null);
  protected authorName = signal(""); // this author's name, entered upon joining the story
  protected authorNameConfirmed = signal(false);
  public messages = signal("");
  protected showAuthorNameClashMessage = signal(false);
  protected showAuthorNameInvalid = signal(false);
  protected stateAwaitingAuthors = signal(false);
  protected stateInProgress = signal(false);
  protected wordToAdd = signal("");

  protected voteSummary = signal<Array<DisplayedVote> | null>(null);
  protected voteOutcome = signal("");

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

  protected turnOnAutoCapitalize = computed(() => {
    if (this.retrievedStory()) {
      if (this.retrievedStory()!.words.length > 1) {
        const currentWordIndex = this.retrievedStory()!.words.length - 1;
        const currentWord = this.retrievedStory()!.words[currentWordIndex];
        if (currentWord.word.endsWith(".")) {
          return true;
        }
      }
    }
    return false;
  });

  protected voteProposedBy = computed(() => {
    return this.retrievedStory()?.voteDetails?.voteProposedBy ?? "";
  });

  protected voteType = computed(() => {
    if (this.retrievedStory()?.voteDetails?.voteType === VoteType.EditWord) {
      return "edit the last word";
    } else {
      return "end the story";
    }
  });

  // toggle visibility of voting buttons
  protected hasVoted = computed(() => {
    if (!this.retrievedStory()?.voteDetails?.voteIsActive) return true; // hides voting buttons when the vote is concluded
    if (this.retrievedStory()?.voteDetails?.voteIsActive) {
      if (this.retrievedStory()?.voteDetails?.votes?.some(v => v.authorName === this.authorName())) {
        return true;
      }
    }
    return false;
  });

  //#endregion

  // handles raising messages for the ui from the websocket server,
  // then gets the updated story
  initializeSocket() {
    const socket: WebSocket = this.socketService.socket;
    socket.addEventListener("message", (event: any) => {
      const message = JSON.parse(event.data);
      //console.info(`${new Date().toUTCString()} - Socket message received: ${message.type}`)
      switch (message.type) {
        case SocketMessageType.WordAdded:
          this.messages.set(`${message.author} added '${message.word.replace("\\", "")}' to the story. 
            ${message.nextAuthor}, it's your turn.`);
          break;
        case SocketMessageType.AuthorJoined:
          this.messages.set(`${message.author} joined the story.`);
          break;
        case SocketMessageType.AuthorLeft:
        case SocketMessageType.UserDisconnected:
          this.messages.set(`${message.author} left the story.`);
          break;
        case SocketMessageType.VoteEnded:
          console.log("Socket message received for vote ended");
          break;
        default: // all other voting message types, i.e. anything that doesn't need a separate message
          break;
      }
      this.getStory();
    });
  }

  // Retrieves the latest data for the story and acts on any changes.
  // Triggered on initial component load, then after every message from
  // the websocket server
  async getStory() {
    if (this.storyId) {
      const previousStoryState = this.retrievedStory()?.state ?? StoryState.AwaitingAuthors;
      const previousAuthorCount = this.retrievedStory()?.authors?.length ?? 0;
      const previousWordCount = this.retrievedStory()?.words.length ?? 0;

      this.apiService.getStory(this.storyId).subscribe({
        next: (story: Story) => {
          this.retrievedStory.set(story); // since this is set following any websocket message, no need to update it from the api calls directly

          // TODO: possibly make these computed
          this.stateAwaitingAuthors.set(story.state === StoryState.AwaitingAuthors);
          this.stateInProgress.set(story.state === StoryState.InProgress);

          if (story.state != previousStoryState && this.stateInProgress() && story.authors.length > 1) {
            this.messages.set(`${this.currentAuthorTurnName()}, add the next word.`);
          }
          if (story.authors.length < 2) this.messages.set(this.messages() + " Waiting for 2 or more authors.");
          
          if (story.authors.length >= 2 && previousAuthorCount < 2 && !this.thisAuthorIsCreator()) {
            if (this.stateInProgress()){
              this.messages.set(`Waiting for ${this.creatorName()} to continue the story.`)
            } else {
              this.messages.set(`Waiting for ${this.creatorName()} to start the story.`)
            }
          }
          // handle voting
          if (story.voteDetails?.voteIsActive) {
            this.processVote(story);
          }

          // play typewriter sound for new word - could add scribble for word deletes?
          if (previousWordCount && previousWordCount < story.words.length) {
            this.audioService.playSound(AudioFile.TypewriterKeystroke);
          }
          console.log("Latest story:", story);
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
        //this.retrievedStory.set(story);
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

  leave() {
    if (!this.retrievedStory()) {
      // no story - home you go
      this.router.navigateByUrl("/");
    }

    this.dialogLeave.nativeElement.showModal();
  }

  confirmLeaveStory() {
    const storyId = this.storyId!;
    const authorName = localStorage.getItem(LocalStorage.UserName)!;

    this.apiService.leaveStory(storyId, authorName).subscribe({
      next: (story: Story) => {
        this.dialogLeave.nativeElement.close();
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
    this.apiService.addWord(this.storyId!, this.wordToAdd(), this.authorName()).subscribe({
      next: (story: Story) => {
        //this.retrievedStory.set(story);
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
    this.apiService.proposeVote(this.storyId!, VoteType.EndStory, this.authorName()).subscribe({      
      error: (err) => {
        console.log("Error:", err);
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
    // populate and show the voting dialog
    const voteType = story.voteDetails!.voteType!;
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
        this.voteOutcome.set("The authors agreed to " + this.voteType());
        // either scrap last word or end story here
        this.resetVotes(voteType, true);
      } else if (noVotes > (eligibleVoters / 2)) {
        this.voteOutcome.set("The authors chose not to " + this.voteType());
        this.resetVotes(voteType, false);
      } else if (yesVotes + noVotes > (eligibleVoters / 2)) {
        this.voteOutcome.set("The majority could not agree to " + this.voteType());
        this.resetVotes(voteType, false);
      } else {
        this.voteOutcome.set("Further votes are required to determine a majority");
      }
    }
  }

  // show the vote outcome and carry out necessary action
  resetVotes(voteType: VoteType, voteCarried: boolean) {
    this.apiService.concludeVote(this.storyId!, voteCarried).subscribe({
      next: (_) => {
        console.log("Response received from conclude vote api call");
        if(voteType === VoteType.EndStory && voteCarried){
          // TODO: persist story to data layer
          localStorage.removeItem(LocalStorage.CurrentStoryId);
          window.location.href = "/";
        }
      },
      error: (err) => {
        console.log("Error concluding vote:", err);
        this.messages.set("There was an error resetting the vote.");
      }
    });
    
    setTimeout(() => {
      this.dialogVote.nativeElement.close();      
      this.voteSummary.set([]);
      this.voteOutcome.set("");
    }, 2000);
  }

  constructor() {
    this.initializeSocket();
    this.messages.set("");
  }

  ngAfterViewInit(): void {
    this.getStory();

    // if author name in local storage, pre-populate the enter name dialog
    if (localStorage.getItem(LocalStorage.UserName)) {
      this.authorName.set(localStorage.getItem(LocalStorage.UserName)!);
    }
    this.dialogEnterName.nativeElement.showModal();
  }
}
