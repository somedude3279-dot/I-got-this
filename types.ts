
export enum GameStage {
  UPLOAD = 'UPLOAD',
  LOADING = 'LOADING',
  STAGE1_QUESTION = 'STAGE1_QUESTION',
  STAGE2_SPOTTING = 'STAGE2_SPOTTING',
  RESULT = 'RESULT'
}

export interface DifferenceLocation {
  id: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  description: string;
  found: boolean;
}

export interface UserClick {
  id: number;
  x: number;
  y: number;
  type: 'hit' | 'miss';
}

export interface GameState {
  originalImage: string | null;
  modifiedImage: string | null;
  differences: DifferenceLocation[];
  stage: GameStage;
  error: string | null;
  userClicks: UserClick[];
}
