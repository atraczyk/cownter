import type {
  CompData,
  ContextResponse,
  HeroesWithRoles,
  MatchContext,
  ScoreUpdate,
  TeamName,
  TeamUpdateResponse,
  TeamsState,
} from './types';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    console.error('Server error:', data);
    throw new Error(data.error || `Server error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function handleError(error: unknown): never {
  console.error('API error:', error);
  throw error;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, init);
    return await handleResponse<T>(response);
  } catch (error) {
    return handleError(error);
  }
}

const jsonInit = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const API = {
  updateTeam(team: TeamName, slot: number, hero: string, teams: TeamsState): Promise<TeamUpdateResponse> {
    return request('/api/update_team', jsonInit({ team, slot, hero, teams }));
  },

  getCurrentScores(): Promise<ScoreUpdate> {
    return request('/api/current_scores');
  },

  clearTeam(team: TeamName): Promise<TeamUpdateResponse> {
    return request('/api/clear_team', jsonInit({ team }));
  },

  restoreTeams(teams: TeamsState): Promise<TeamUpdateResponse> {
    return request('/api/restore_teams', jsonInit(teams));
  },

  getHeroesWithRoles(): Promise<HeroesWithRoles> {
    return request('/api/heroes_with_roles');
  },

  getCompData(): Promise<CompData> {
    return request('/api/comp_data');
  },

  setContext(context: MatchContext, teams: TeamsState): Promise<ContextResponse> {
    const { map, point, side } = context;
    return request('/api/context', jsonInit({ map, point, side, teams }));
  },
};
