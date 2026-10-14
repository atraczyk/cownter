import './styles.css';
import { API } from './api';
import { HeroSelector } from './heroSelector';
import { ScoreManager } from './scoreManager';
import { SuggestionManager } from './suggestionManager';
import { TeamManager } from './teamManager';

function bindClearButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-clear-team]').forEach((button) => {
    button.addEventListener('click', () => {
      const team = button.dataset.clearTeam;
      if (team === 'enemy' || team === 'counter') {
        TeamManager.clearTeam(team);
      }
    });
  });
}

async function start(): Promise<void> {
  HeroSelector.init();
  const savedTeams = TeamManager.loadTeams();
  const heroData = await API.getHeroesWithRoles();

  HeroSelector.populateHeroSelector(heroData);
  TeamManager.updateDropdowns(heroData);
  TeamManager.restoreTeamSelections(savedTeams);
  HeroSelector.updateSelectorPosition();
  TeamManager.initSelectionHandlers();

  const restored = await API.restoreTeams(savedTeams);
  if (restored.current_scores || restored.enemy_scores) {
    ScoreManager.updateTeamScores({
      current_scores: restored.current_scores,
      enemy_scores: restored.enemy_scores,
    });
  }

  const firstEnemyHero = restored.teams.enemy.find((hero) => hero !== null);
  if (!firstEnemyHero) return;

  const suggestions = await API.requestSuggestions(firstEnemyHero);
  if (suggestions.suggestions) {
    SuggestionManager.updateCounterSuggestions(suggestions.suggestions);
  }
}

bindClearButtons();
window.addEventListener('load', () => {
  start().catch((error: unknown) => {
    console.error('Error initializing application:', error);
  });
});
