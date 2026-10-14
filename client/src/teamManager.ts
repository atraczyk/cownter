import type { HeroesWithRoles, TeamName, TeamsState } from './types';
import { API } from './api';
import { ScoreManager } from './scoreManager';
import { SuggestionManager } from './suggestionManager';
import { updateHeroIcon } from './utils';

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
  return team === 'enemy' ? 'enemy' : 'current';
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
    if (!confirm(`Clear ${teamLabel(team)} team selections?`)) return;

    document.querySelectorAll<HTMLSelectElement>(`.hero-select[data-team="${team}"]`).forEach((select) => {
      select.value = '';
      updateHeroIcon(select);
    });

    if (team === 'enemy') {
      const rightColumn = document.querySelector('.right-column');
      if (rightColumn) rightColumn.innerHTML = '';
    }

    API.clearTeam(team)
      .then((data) => {
        this.saveTeams(data.teams);
        ScoreManager.updateTeamScores({
          current_scores: data.current_scores,
          enemy_scores: data.enemy_scores,
        });

        if (team === 'enemy') {
          const rightColumn = document.querySelector('.right-column');
          if (rightColumn) rightColumn.innerHTML = '';
        }
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
        const option = document.createElement('option');
        option.value = hero;
        option.textContent = hero;
        select.appendChild(option);
      });

      if (currentValue) select.value = currentValue;
    });
  },

  updateHeroSelect(select: HTMLSelectElement, hero: string): void {
    select.value = hero || '';
    updateHeroIcon(select);

    const team = select.dataset.team as TeamName;
    const slot = Number(select.dataset.slot);

    API.updateTeam(team, slot, hero)
      .then((data) => {
        if (data.error) {
          console.error('Error:', data.error);
          alert(data.error);
          select.value = '';
          updateHeroIcon(select);
          return;
        }

        this.saveTeams(data.teams);
        if (data.current_scores || data.enemy_scores) {
          ScoreManager.updateTeamScores({
            current_scores: data.current_scores,
            enemy_scores: data.enemy_scores,
          });
        }

        if (team !== 'enemy') return;

        if (!hero) {
          const firstEnemyHero = data.teams.enemy.find((entry) => entry !== null);
          if (firstEnemyHero) {
            API.requestSuggestions(firstEnemyHero).then((suggestionData) => {
              if (suggestionData.suggestions) {
                SuggestionManager.updateCounterSuggestions(suggestionData.suggestions);
              }
            });
          } else {
            const rightColumn = document.querySelector('.right-column');
            if (rightColumn) rightColumn.innerHTML = '';
          }
        } else if (data.suggestions) {
          SuggestionManager.updateCounterSuggestions(data.suggestions);
        }
      })
      .catch((error: unknown) => {
        console.error('Error:', error);
        alert('An error occurred while updating the team.');
        select.value = '';
        updateHeroIcon(select);
      });
  },

  initSelectionHandlers(): void {
    document.querySelectorAll<HTMLSelectElement>('.hero-select').forEach((select) => {
      select.addEventListener('change', () => {
        const team = select.dataset.team as TeamName;
        const slot = Number(select.dataset.slot);
        const hero = select.value;

        updateHeroIcon(select);

        API.updateTeam(team, slot, hero)
          .then((data) => {
            if (data.error) {
              console.error('Data error:', data.error);
              alert(data.error);
              select.value = '';
              updateHeroIcon(select);
              return;
            }

            this.saveTeams(data.teams);

            if (team === 'enemy') {
              if (data.suggestions) {
                SuggestionManager.updateCounterSuggestions(data.suggestions);
              } else {
                const firstEnemyHero = data.teams.enemy.find((entry) => entry !== null);
                if (firstEnemyHero) {
                  API.requestSuggestions(firstEnemyHero)
                    .then((suggestionData) => {
                      if (suggestionData.suggestions) {
                        SuggestionManager.updateCounterSuggestions(suggestionData.suggestions);
                      }
                    })
                    .catch((error: unknown) => {
                      console.error('Error fetching suggestions:', error);
                    });
                }
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
            alert(`Error updating team: ${message}`);
            select.value = '';
            updateHeroIcon(select);
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
  },
};
