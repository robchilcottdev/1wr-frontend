export enum SocketMessageType {
  UserConnected = 'user_connected',
  UserDisconnected = 'user_disconnected',
  AuthorJoined = 'author_joined',
  AuthorLeft = 'author_left',
  StoryDeleted = 'story_deleted',
  WordAdded = 'word_added',
  StateChanged = 'state_changed',
  VoteStarted = 'vote_started',
  VoteMade = 'vote_made',
  VoteEnded = "vote_ended"
}

export type User = {
  id: string;
  name: string;
}

export type Story = {
  storyId: string;
  title: string;
  authors: Author[];
  state: StoryState;
  words: StoryWord[];
  authorTurn: number;
  votingScheme?: VotingScheme;
  voteDetails?: VoteDetails;
}

export type StoryWord = {
  authorName: string;
  word: string;
}

export enum StoryState {
  AwaitingAuthors,
  InProgress,
  Completed
}

export type Author = {
  id: string;
  name: string;
  isCreator: boolean;
}

export type VoteDetails = {
  voteIsActive: boolean;
  voteProposedBy?: string;
  previousVoteProposedBy?: string;
  voteType?: VoteType | null;
  votes?: Array<{ authorName: string, vote: boolean }> | null;
}

export enum VoteType {
    EditWord,
    EndStory
}

export enum VotingScheme {
  Unilateral,
  Majority,
  Unanimous  
}

export type DisplayedVote = {
  authorName: string,
  voteForDisplay: boolean | null
}

export enum UserErrors {
  MultipleConsecutiveVotes
}

export enum LocalStorage {
  UserId = "1wr-id",
  UserName = "1wr-username",
  CurrentStoryId = "1wr-currentstory"
}

export enum AudioFile {
  TypewriterKeystroke = "typewriter-keystroke.wav"
}

