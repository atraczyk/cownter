export type Role = 'tank' | 'damage' | 'support';

export type TeamName = 'enemy' | 'counter';

export type Archetype = 'dive' | 'poke' | 'brawl';

export type Side = 'attack' | 'defense';

export type CompWeights = Record<Archetype, number>;

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
  map_fit?: Record<string, number>;
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

export interface GameMode {
  id: string;
  name: string;
  sided: boolean;
}

export interface MapPoint {
  id: string;
  name: string;
  comp: CompWeights | Record<Side, CompWeights>;
}

export interface GameMap {
  id: string;
  name: string;
  mode: string;
  points: MapPoint[];
}

export interface CompData {
  archetypes: {
    version: string;
    status?: string;
    descriptions: Record<Archetype, string>;
    heroes: Record<string, CompWeights>;
  };
  maps: {
    version: string;
    status?: string;
    modes: GameMode[];
    maps: GameMap[];
  };
}

export interface MatchContext {
  mode: string | null;
  map: string | null;
  point: string | null;
  side: Side | null;
}

export interface ContextResponse {
  context: Omit<MatchContext, 'mode'>;
  map_fit: Record<string, number>;
  suggestions: Suggestions | null;
}
