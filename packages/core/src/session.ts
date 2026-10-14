import { loadCompData } from './data';
import { heroData } from './data';
import { scoreTeams, heroesWithRoles } from './scores';
import { suggestCounterTeam } from './suggest';
import type {
  CompData,
  ContextResponse,
  MatchContext,
  ScoreUpdate,
  Side,
  Suggestions,
  TeamName,
  TeamsState,
} from './types';

const SIDES: Side[] = ['attack', 'defense'];

export function emptyTeams(): TeamsState {
  return {
    enemy: [null, null, null, null, null],
    counter: [null, null, null, null, null],
  };
}

export function emptyContext(): MatchContext {
  return { mode: null, map: null, point: null, side: null };
}

/** In-memory match state used by the static UI (replaces the Flask team store). */
export class MatchSession {
  teams: TeamsState = emptyTeams();
  context: MatchContext = emptyContext();
  private readonly comp = loadCompData();

  getCompData(): CompData {
    return this.comp.clientPayload();
  }

  getHeroesWithRoles() {
    return heroesWithRoles(heroData);
  }

  mapFit(): Record<string, number> {
    return this.comp.fitBonuses(this.comp.preferenceFor(this.context));
  }

  /** Fit for the enemy team, who play the opposite side on sided modes. */
  enemyMapFit(): Record<string, number> {
    const { side } = this.context;
    const enemySide = side ? SIDES.find((entry) => entry !== side) ?? null : null;
    return this.comp.fitBonuses(this.comp.preferenceFor({ ...this.context, side: enemySide }));
  }

  private contextResponse(): ContextResponse {
    return {
      context: this.context,
      map_fit: this.mapFit(),
      enemy_map_fit: this.enemyMapFit(),
      suggestions: this.suggestionsIfReady(),
      ...this.currentScores(),
    };
  }

  setContext(next: Partial<MatchContext>): ContextResponse {
    const side = next.side && SIDES.includes(next.side) ? next.side : null;
    this.context = {
      mode: next.mode ?? null,
      map: next.map ?? null,
      point: next.point ?? null,
      side: next.map ? side : null,
    };
    return this.contextResponse();
  }

  /** Apply a full context object from the UI (including mode). */
  applyContext(context: MatchContext): ContextResponse {
    const side = context.side && SIDES.includes(context.side) ? context.side : null;
    this.context = {
      mode: context.mode,
      map: context.map,
      point: context.point,
      side,
    };
    return this.contextResponse();
  }

  restoreTeams(teams: TeamsState): ScoreUpdate & { teams: TeamsState } {
    this.teams = {
      enemy: [...teams.enemy],
      counter: [...teams.counter],
    };
    return { teams: this.teams, ...this.currentScores() };
  }

  clearTeam(team: TeamName): ScoreUpdate & { teams: TeamsState } {
    this.teams[team] = [null, null, null, null, null];
    return { teams: this.teams, ...this.currentScores() };
  }

  updateTeam(
    team: TeamName,
    slot: number,
    hero: string,
    pageTeams?: TeamsState,
  ): ScoreUpdate & { teams: TeamsState; suggestions?: Suggestions | null; error?: string } {
    if (pageTeams) {
      this.teams = {
        enemy: [...pageTeams.enemy],
        counter: [...pageTeams.counter],
      };
    }

    if (slot < 0 || slot >= this.teams[team].length) {
      return { error: 'Invalid slot specified', teams: this.teams };
    }

    const value = hero || null;
    if (value && this.teams[team].some((entry, index) => index !== slot && entry === value)) {
      return { error: 'This hero is already selected!', teams: this.teams };
    }

    this.teams[team][slot] = value;
    const response: ScoreUpdate & {
      teams: TeamsState;
      suggestions?: Suggestions | null;
      error?: string;
    } = {
      teams: this.teams,
      ...this.currentScores(),
    };

    if (team === 'enemy' && this.teams.enemy.every(Boolean)) {
      response.suggestions = this.suggestionsIfReady();
    }

    return response;
  }

  currentScores(): ScoreUpdate {
    return scoreTeams(heroData, this.teams.counter, this.teams.enemy, this.mapFit(), this.enemyMapFit());
  }

  suggestionsIfReady(): Suggestions | null {
    if (!this.teams.enemy.every(Boolean)) return null;
    const enemies = this.teams.enemy.filter((hero): hero is string => Boolean(hero));
    return suggestCounterTeam(heroData, enemies, this.mapFit());
  }
}
