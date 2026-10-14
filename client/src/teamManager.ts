import type { HeroesWithRoles, TeamName, TeamsState } from './types';
import { API } from './api';
import { ScoreManager } from './scoreManager';
import { SuggestionManager } from './suggestionManager';
import { updateHeroIcon } from './utils';
import { notifyViewChange } from './viewState';

const EMPTY_TEAMS = (): TeamsState => ({
  enemy: [null, null, null, null, null],
  counter: [null, null, null, null, null],
});

function isTeamsState(value: unknown): value is TeamsState {
  if (!value || typeof value !== 'object') return false;
  const teams = value as TeamsState;
  return Array.isArray(teams.enemy) && Array.isArray(teams.counter);
}

function teamLabel(team: TeamName): string {
  return team === 'enemy' ? 'enemy' : 'your';
}

export const TeamManager = {
  saveTeams(teams: TeamsState): void {
    localStorage.setItem('ow2_teams', JSON.stringify(teams));
  },

  loadTeams(): TeamsState {
    const saved = localStorage.getItem('ow2_teams');
    if (!saved) return EMPTY_TEAMS();
    try {
      const parsed: unknown = JSON.parse(saved);
      return isTeamsState(parsed) ? parsed : EMPTY_TEAMS();
    } catch {
      return EMPTY_TEAMS();
    }
  },

  clearTeam(team: TeamName): void {
    if (!confirm(`Clear ${teamLabel(team)} team?`)) return;

    document.querySelectorAll<HTMLSelectElement>(`.hero-select[data-team="${team}"]`).forEach((select) => {
      select.value = '';
      updateHeroIcon(select);
    });
    if (team === 'enemy') SuggestionManager.clear();
    notifyViewChange();

    API.clearTeam(team)
      .then((data) => {
        this.saveTeams(data.teams);
        ScoreManager.updateTeamScores({
          current_scores: data.current_scores,
          enemy_scores: data.enemy_scores,
        });
      })
      .catch((error: unknown) => {
        console.error('Error clearing team:', error);
      });
  },

  updateDropdowns(heroData: HeroesWithRoles): void {
    document.querySelectorAll<HTMLSelectElement>('.hero-select').forEach((select) => {
      const role = select.dataset.role;
      const team = select.dataset.team;
      const currentSlot = select.dataset.slot;
      const currentValue = select.value;

      const selectedHeroes = Array.from(
        document.querySelectorAll<HTMLSelectElement>(`.hero-select[data-team="${team}"][data-role="${role}"]`),
      )
        .filter((otherSelect) => otherSelect.dataset.slot !== currentSlot)
        .map((otherSelect) => otherSelect.value)
        .filter(Boolean);

      const filteredHeroes = Object.entries(heroData)
        .filter(([hero, data]) => data.role === role && !selectedHeroes.includes(hero))
        .map(([hero]) => hero)
        .sort();

      while (select.options.length > 1) {
        select.remove(1);
      }

      filteredHeroes.forEach((hero) => {
        select.appendChild(new Option(hero, hero));
      });

      if (currentValue) select.value = currentValue;
    });
  },

  initSelectionHandlers(): void {
    document.querySelectorAll<HTMLSelectElement>('.hero-select').forEach((select) => {
      select.addEventListener('change', () => {
        const team = select.dataset.team as TeamName;
        const slot = Number(select.dataset.slot);
        const hero = select.value;

        updateHeroIcon(select);
        notifyViewChange();

        API.updateTeam(team, slot, hero)
          .then((data) => {
            if (data.error) {
              alert(data.error);
              select.value = '';
              updateHeroIcon(select);
              notifyViewChange();
              return;
            }

            this.saveTeams(data.teams);

            if (team === 'enemy') {
              if (data.suggestions) {
                SuggestionManager.updateCounterSuggestions(data.suggestions);
              } else if (data.teams.enemy.some((entry) => !entry)) {
                SuggestionManager.clear();
              }
            }

            return API.getCurrentScores().then((scoreData) => {
              ScoreManager.updateTeamScores({
                current_scores: scoreData.current_scores,
                enemy_scores: scoreData.enemy_scores,
              });
            });
          })
          .catch((error: unknown) => {
            console.error('Error updating team:', error);
            const message = error instanceof Error ? error.message : String(error);
            alert(`Could not update the team: ${message}`);
            select.value = '';
            updateHeroIcon(select);
            notifyViewChange();
          });
      });
    });
  },

  restoreTeamSelections(savedTeams: TeamsState): void {
    (Object.entries(savedTeams) as Array<[TeamName, TeamsState[TeamName]]>).forEach(([team, heroes]) => {
      heroes.forEach((hero, slot) => {
        if (!hero) return;
        const select = document.querySelector<HTMLSelectElement>(
          `.hero-select[data-team="${team}"][data-slot="${slot}"]`,
        );
        if (!select) return;
        select.value = hero;
        updateHeroIcon(select);
      });
    });
    notifyViewChange();
  },
};
