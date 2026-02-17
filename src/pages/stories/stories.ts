import { Component, ElementRef, inject, signal, ViewChild, AfterViewInit, OnDestroy, computed } from '@angular/core';
import { TitleBlock } from "../../components/title-block/title-block";
import { ApiService } from '../../services/api-service';
import { SocketService } from '../../services/socket-service';
import { AudioService } from '../../services/audio-service';
import { AudioFile, LocalStorage, SocketMessageType, Story, StoryState, VoteType, DisplayedVote, VotingScheme } from '../../types';
import { AuthorListPipe } from '../../core/author-list-pipe';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RestrictStoryword } from "../../core/restrict-storyword-directive";
import { Subject, switchMap } from 'rxjs';

@Component({
  selector: 'app-stories',
  standalone: true,
  imports: [TitleBlock, FormsModule, AuthorListPipe, RestrictStoryword],
  templateUrl: './stories.html',
  styleUrl: './stories.css'
})
export class Stories implements AfterViewInit, OnDestroy {
  @ViewChild('dialogEnterName') dialogEnterName!: ElementRef;
  @ViewChild('dialogLeave') dialogLeave!: ElementRef;
  @ViewChild('dialogVote') dialogVote!: ElementRef;
  @ViewChild('dialogError') dialogError!: ElementRef;
  @ViewChild('storyBodyText') storyBodyText!: ElementRef;
  @ViewChild('endOfStoryBodyText') endOfStoryBodyText!: ElementRef;
  @ViewChild('lastWord') lastWord!: ElementRef;
  @ViewChild('audioAddWord') audioAddWordRef!: ElementRef;
  @ViewChild('audioSkipTurn') audioSkipTurnRef!: ElementRef;

  // #region variables
  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  protected readonly apiService = inject(ApiService);
  protected readonly socketService = inject(SocketService);
  protected readonly audioService = inject(AudioService);

  private storyUpdate$ = new Subject<void>();
  protected storyId = localStorage.getItem(LocalStorage.CurrentStoryId) ?? this.route.snapshot.paramMap.get("id");

  protected retrievedStory = signal<Story | null>(null);
  protected authorName = signal("");
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
  protected intervalId = signal<any | null>(null);
  protected countdownTimerInitialized = signal<boolean>(false);

  protected audioAddWordUrl = "./assets/audio/" + AudioFile.TypewriterKeystroke;
  protected audioSkipTurnUrl = "./assets/audio/" + AudioFile.SkipTurnBeep;
  // #endregion

  // #region computed signals
  protected thisAuthorIsCreator = computed(() => {
    const story = this.retrievedStory();
    if (!story) return false;
    const creator = story.authors.find(a => a.isCreator);
    return creator?.name === this.authorName();
  });

  protected creatorName = computed(() => {
    const story = this.retrievedStory();
    if (!story || story.authors.length === 0) return "";
    const creator = story.authors.find(a => a.isCreator);
    return creator?.name;
  });

  protected isThisAuthorsTurn = computed(() => {
    const story = this.retrievedStory();
    if (!story || story.authors.length < 2) return false;
    const authorTurnIndex = story.authorTurn;
    const currentTurnAuthor = story.authors[authorTurnIndex];
    const thisAuthorId = localStorage.getItem(LocalStorage.UserId);
    return currentTurnAuthor.id === thisAuthorId;
  });

  protected currentAuthorTurnName = computed(() => {
    const story = this.retrievedStory();
    if (!story || story.authors.length === 0) return "";
    const authorTurnIndex = story.authorTurn;
    return story.authors[authorTurnIndex].name;
  });

  protected hasAtLeastOneAuthor = computed(() => (this.retrievedStory()?.authors.length ?? 0) > 0);
  protected hasLessThanTwoAuthors = computed(() => (this.retrievedStory()?.authors.length ?? 0) < 2);
  protected wordLimitReached = computed(() => this.retrievedStory()?.words.length === this.retrievedStory()?.wordLimit);
  protected stateAwaitingAuthors = computed(() => this.retrievedStory()?.state === StoryState.AwaitingAuthors);
  protected stateInProgress = computed(() => this.retrievedStory()?.state === StoryState.InProgress);
  protected voteProposedBy = computed(() => this.retrievedStory()?.voteDetails?.voteProposedBy ?? "");
  protected voteIsActive = computed(() => this.retrievedStory()?.voteDetails?.voteIsActive);
  protected hasVoted = computed(() => this.retrievedStory()?.voteDetails?.votes?.some(v => v.authorName === this.authorName()));

  protected voteType = computed(() => {
    const type = this.retrievedStory()?.voteDetails?.voteType;
    if (type === VoteType.EditWord) return "edit the last word";
    if (type === VoteType.EndStory) return "end the story";
    return "voteType unspecified";
  });
  // #endregion

  constructor() {
    this.initializeSocket();
    this.setupStoryStream();
    this.messages.set("");
  }

  ngAfterViewInit(): void {
    this.countdownTimerInitialized.set(false);
    this.getStory();
  }

  ngOnDestroy(): void {
    this.resetCountdownTimer();
    this.storyUpdate$.complete();
  }

  private setupStoryStream() {
    this.storyUpdate$.pipe(
      switchMap(() => this.apiService.getStory(this.storyId!))
    ).subscribe({
      next: (story: Story) => this.handleStoryUpdate(story),
      error: (err) => console.error("Error retrieving story:", err)
    });
  }

  getStory() {
    if (this.storyId) {
      this.storyUpdate$.next();
    } else {
      this.messages.set("Story not found.");
    }
  }

  private handleStoryUpdate(story: Story) {
    const prev = this.retrievedStory();
    const previousStoryState = prev?.state ?? StoryState.AwaitingAuthors;
    const previousWordCount = prev?.words.length;
    const voteWasActive = prev?.voteDetails?.voteIsActive ?? false;
    const voteIsActiveNow = story.voteDetails?.voteIsActive ?? false;
    const voteJustFinished = voteWasActive && !voteIsActiveNow;
    const turnChanged = prev?.authorTurn !== story.authorTurn;
    const wordCountChanged = previousWordCount !== story.words.length;
    const stateChanged = prev?.state !== story.state;

    if (!this.countdownTimerInitialized()) {
      this.countdownTimerMax.set(story.timeLimit);
      this.countdownTimer.set(story.timeLimit);
      this.countdownTimerInitialized.set(true);
    }

    this.retrievedStory.set(story);
    this.scrollToBottom(wordCountChanged && previousWordCount !== undefined);

    // --- Timer Logic ---
    if (this.countdownTimerMax() > 0) {
      if (story.state === StoryState.InProgress && story.authors.length >= 2 && !story.voteDetails?.voteIsActive) {
        // Restart timer if:
        // - The turn index changed
        // - A word was added
        // - The game just started
        // - OR: A vote just finished (regardless of outcome)
        if (turnChanged || wordCountChanged || stateChanged || voteJustFinished) {
          console.log("Timer triggered. Reason - Vote Finished:", voteJustFinished);
          this.triggerCountdown();
        }
      } else {
        // If a vote is active, or game is over, keep it paused
        this.resetCountdownTimer();
      }
    }

    // --- Dialogs & States ---
    if (!this.authorNameConfirmed()) {
      if (localStorage.getItem(LocalStorage.UserName)) {
        this.authorName.set(localStorage.getItem(LocalStorage.UserName)!);
      }
      this.dialogEnterName.nativeElement.showModal();
    }

    if (story.state !== previousStoryState && story.state === StoryState.Completed) {
      this.storyEnded.set(true);
      this.messages.set("Thanks for writing!");
      localStorage.removeItem(LocalStorage.CurrentStoryId);
    }

    if (story.state !== previousStoryState && story.state === StoryState.InProgress && story.authors.length > 1) {
      this.messages.set(`${this.currentAuthorTurnName()}, it's your turn.`);
    }

    if (story.authors.length < 2) {
      this.messages.set("Waiting for 2 or more authors.");
    }

    if (story.voteDetails?.voteIsActive) {
      const yesVotes = story.voteDetails.votes?.filter(v => v.vote === true).length ?? 0;
      const noVotes = story.voteDetails.votes?.filter(v => v.vote === false).length ?? 0;
      const eligibleVoters = story.authors.length;

      // Check if we are already at a conclusion
      const isResolved = (yesVotes > eligibleVoters / 2) || (noVotes > eligibleVoters / 2) || (yesVotes + noVotes === eligibleVoters);

      if (!isResolved) {
        this.processVote(story);
      } else {
        // If it's resolved but the server hasn't flipped "voteIsActive" to false yet,
        // just ensure the dialog is closed and handle the resolution.
        this.handleVoteResolution(yesVotes > noVotes);
      }
    } else {
      // If a vote isn't active, make sure that dialog is definitely gone
      if (this.dialogVote?.nativeElement.open) {
        this.closeVoteDialog();
      }
    }
  }

  // #region Timer Core
  triggerCountdown() {
    this.resetCountdownTimer();
    this.countdownTimer.set(this.countdownTimerMax());

    const interval = setInterval(() => {
      const nextVal = this.countdownTimer() - 1;
      if (nextVal <= 0) {
        this.handleTimerExpiry();
      } else {
        this.countdownTimer.set(nextVal);
      }
    }, 1000);

    this.intervalId.set(interval);
  }

  private handleTimerExpiry() {
    this.resetCountdownTimer();
    this.countdownTimer.set(0);
    if (this.isThisAuthorsTurn()) {
      this.apiService.skipTurn(this.storyId!, this.authorName()).subscribe({
        error: (err) => console.error("Error processing timer expiry:", err)
      });
    }
  }

  resetCountdownTimer() {
    if (this.intervalId()) {
      clearInterval(this.intervalId());
      this.intervalId.set(null);
    }
  }
  // #endregion

  initializeSocket() {
    const socket: WebSocket = this.socketService.socket;
    socket.addEventListener("message", (event: any) => {
      const message = JSON.parse(event.data);
      console.info(`${new Date().toUTCString()} - Socket message received: ${message.type}`);
      switch (message.type) {
        case SocketMessageType.WordAdded:
          this.messages.set(`${message.author} added '${message.word.replace("\\", "")}' to the story. ${message.nextAuthor}, it's your turn.`);
          this.getStory();
          this.audioAddWordRef!.nativeElement.play();
          break;
        case SocketMessageType.SkippedTurn:
        case SocketMessageType.ClientCountdownTimerExpired:
          this.messages.set(`${message.author} passed or ran out of time!`);
          this.getStory();
          this.audioSkipTurnRef!.nativeElement.play();
          break;
        case SocketMessageType.AuthorJoined:
          this.messages.set(`${message.author} joined the story.`);
          this.getStory();
          break;
        case SocketMessageType.AuthorLeft:
        case SocketMessageType.UserDisconnected:
          this.messages.set(`${message.author} left the story.`);
          this.getStory();
          break;
        case SocketMessageType.StateChanged:
        case SocketMessageType.VoteStarted:
        case SocketMessageType.VoteMade:
        case SocketMessageType.VoteEnded:
          this.getStory();
          break;
        case SocketMessageType.ClientVoteOutcomeMessage:
          // Show the message in the main game message bar
          this.messages.set(message.data);
          // Optional: clear the message after 5 seconds so it doesn't stay there forever
          setTimeout(() => {
            if (this.messages() === message.data) {
              this.getStory(); // Refresh turn message
            }
          }, 5000);
          break;
      }
    });
  }

  joinStory() {
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
      next: () => {
        this.authorNameConfirmed.set(true);
        localStorage.setItem(LocalStorage.UserName, this.authorName());
        localStorage.setItem(LocalStorage.CurrentStoryId, this.storyId!);
      },
      error: (err) => console.error("Error joining story:", err)
    });
  }

  beginStory() {
    this.apiService.updateStoryState(this.storyId!, StoryState.InProgress).subscribe({
      next: (story: Story) => this.messages.set(`${story.authors[story.authorTurn].name}, it's your turn`),
      error: (err) => this.messages.set("Error starting story")
    });
  }

  addWord() {
    if (!this.wordToAdd()) {
      this.messages.set("No passes allowed! Please add a word.");
      return;
    }
    if (this.wordToAdd().length > 20) {
      this.messages.set("20 characters should be more than enough!");
      this.wordToAdd.set("");
      return;
    }
    this.apiService.addWord(this.storyId!, this.wordToAdd(), this.authorName()).subscribe({
      error: () => this.messages.set("Error adding word"),
      complete: () => this.wordToAdd.set("")
    });
  }

  // #region Voting
  voteToEnd() {
    if (this.authorName() === this.retrievedStory()?.voteDetails?.previousVoteProposedBy) {
      this.errorDialogText.set("Multiple consecutive votes are not allowed.");
      this.dialogError.nativeElement.showModal();
      return;
    }
    this.apiService.proposeVote(this.storyId!, VoteType.EndStory, this.authorName()).subscribe({
      error: () => this.messages.set("Error starting vote")
    });
  }

  voteToEdit() {
    if (this.authorName() === this.retrievedStory()?.voteDetails?.previousVoteProposedBy) {
      this.errorDialogText.set("Multiple consecutive votes are not allowed.");
      this.dialogError.nativeElement.showModal();
      return;
    }
    this.apiService.proposeVote(this.storyId!, VoteType.EditWord, this.authorName()).subscribe({
      error: () => this.messages.set("Error starting vote")
    });
  }

  makeVote(vote: boolean) {
    this.apiService.makeVote(this.storyId!, vote, this.authorName()).subscribe({
      error: () => this.messages.set("Error making vote")
    });
  }

  processVote(story: Story): void {
    // 1. Build the summary for the UI
    let voteSummary: Array<DisplayedVote> = [];
    story.voteDetails!.votes!.forEach(v => voteSummary.push({ authorName: v.authorName, voteForDisplay: v.vote }));
    story.authors.forEach(a => {
      if (!story.voteDetails!.votes!.some(v => v.authorName === a.name)) {
        voteSummary.push({ authorName: a.name, voteForDisplay: null });
      }
    });
    this.voteSummary.set(voteSummary);

    // 2. Open modal only if not already open
    if (!this.dialogVote.nativeElement.open) {
      this.dialogVote.nativeElement.showModal();
    }

    // 3. Logic check: If everyone has voted or a majority is reached, the server 
    // will eventually send a VoteEnded message, but let's handle the UI side.
    const yesVotes = story.voteDetails!.votes!.filter(v => v.vote === true).length;
    const noVotes = story.voteDetails!.votes!.filter(v => v.vote === false).length;
    const eligibleVoters = story.authors.length;

    if (story.votingScheme === VotingScheme.Majority) {
      const majorityReached = yesVotes > (eligibleVoters / 2) || noVotes > (eligibleVoters / 2);
      const allVoted = (yesVotes + noVotes === eligibleVoters);

      if (majorityReached || allVoted) {
        // We don't close it HERE yet; we wait for the server to confirm via concludeVote 
        // or we can close it immediately to keep it snappy.
        this.handleVoteResolution(yesVotes > noVotes);
      }
    }
  }

  private handleVoteResolution(carried: boolean) {
    const outcomeText = carried
      ? `✅ Vote passed: ${this.voteType()}`
      : `❌ Vote failed: ${this.voteType()}`;

    // 1. Close the UI immediately so no "Empty Modal" appears
    this.closeVoteDialog();

    // 2. Inform the server and other players
    this.broadcastVoteOutcome(outcomeText);
    this.concludeVote(carried);

    // 3. Set the message locally (Socket will handle it for others)
    this.messages.set(outcomeText);
  }

  broadcastVoteOutcome(message: string) {
    this.socketService.socket.send(JSON.stringify({
      type: SocketMessageType.ClientVoteOutcome,
      storyId: this.storyId,
      message: message
    }));
  }

  concludeVote(voteCarried: boolean) {
    this.apiService.concludeVote(this.storyId!, voteCarried).subscribe({
      error: (err) => console.error("Error concluding vote:", err)
    });
  }

  closeVoteDialog() {
    this.dialogVote.nativeElement.close();
    this.voteSummary.set([]);
    this.voteOutcome.set("");
  }
  // #endregion

  // #region Navigation & Helpers
  canDeactivate(): boolean {
    if (this.allowNavigateAway()) return true;
    this.leave();
    return false;
  }

  leave() {
    if (!this.retrievedStory() || this.retrievedStory()!.state === StoryState.Completed) {
      this.allowNavigateAway.set(true);
      this.router.navigateByUrl("/");
      return;
    }
    this.dialogLeave.nativeElement.showModal();
  }

  confirmLeaveStory() {
    this.apiService.leaveStory(this.storyId!, this.authorName()).subscribe({
      next: () => {
        this.dialogLeave.nativeElement.close();
        this.allowNavigateAway.set(true);
        this.router.navigateByUrl("/");
      },
      error: () => {
        this.dialogLeave.nativeElement.close();
        this.router.navigateByUrl("/");
      }
    });
  }

  closeEnterNameDialog() {
    this.dialogEnterName.nativeElement.close();
    this.router.navigateByUrl("/");
  }

  scrollToBottom(flashNewWord: boolean) {
    setTimeout(() => {
      this.endOfStoryBodyText.nativeElement.scrollIntoView({ behavior: 'smooth' });
      if (flashNewWord) this.flashFinalWord();
    }, 100);
  }

  flashFinalWord() {
    if (this.lastWord) {
      this.lastWord.nativeElement.classList.add("bg-yellow-300", "border", "border-black");
      setTimeout(() => this.lastWord.nativeElement.classList.remove("bg-yellow-300", "border", "border-black"), 500);
    }
  }
  // #endregion
}