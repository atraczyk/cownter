import { MatchSession, type MatchContext, type TeamName, type TeamsState } from '@ow2/core';

/** Local match engine — no HTTP server. */
export const session = new MatchSession();

export const API = {
  updateTeam(team: TeamName, slot: number, hero: string, teams: TeamsState) {
    return Promise.resolve(session.updateTeam(team, slot, hero, teams));
  },

  getCurrentScores() {
    return Promise.resolve(session.currentScores());
  },

  clearTeam(team: TeamName) {
    return Promise.resolve(session.clearTeam(team));
  },

  restoreTeams(teams: TeamsState) {
    return Promise.resolve(session.restoreTeams(teams));
  },

  getSuggestions() {
    return Promise.resolve(session.suggestionsIfReady());
  },

  getHeroesWithRoles() {
    return Promise.resolve(session.getHeroesWithRoles());
  },

  getCompData() {
    return Promise.resolve(session.getCompData());
  },

  setContext(context: MatchContext, teams: TeamsState) {
    session.restoreTeams(teams);
    return Promise.resolve(session.applyContext(context));
  },
};
