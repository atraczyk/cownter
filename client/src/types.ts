export type Role = 'tank' | 'damage' | 'support';

export type TeamName = 'enemy' | 'counter';

export interface HeroRoleInfo {
  role: Role;
}

export type HeroesWithRoles = Record<string, HeroRoleInfo>;

export type TeamSlots = Array<string | null>;

export interface TeamsState {
  enemy: TeamSlots;
  counter: TeamSlots;
}

/** [hero, score, countered heroes, synergizing heroes] */
export type HeroScore = [string, number, string[]?, string[]?];

export interface ScoreBlock {
  total_score: number;
  heroes: HeroScore[];
}

export interface Suggestions {
  tank?: HeroScore[];
  damage?: HeroScore[];
  support?: HeroScore[];
}

export interface ScoreUpdate {
  current_scores?: ScoreBlock | null;
  enemy_scores?: ScoreBlock | null;
}

export interface TeamUpdateResponse extends ScoreUpdate {
  error?: string;
  teams: TeamsState;
  suggestions?: Suggestions | null;
}
