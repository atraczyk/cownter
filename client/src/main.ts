import './styles.css';
import { API } from './api';
import { Compass } from './compass';
import { paintTeamFitChips } from './fitChip';
import { HeroSelector } from './heroSelector';
import { MatchContextBar } from './matchContext';
import { ScoreManager } from './scoreManager';
import { SuggestionManager } from './suggestionManager';
import { renderTeamRows } from './teamRows';
import { showStatus, TeamManager } from './teamManager';
import { loadContext, onViewChange, viewState } from './viewState';

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

function refreshView(): void {
  Compass.render();
  paintTeamFitChips();
  HeroSelector.paintFit();
  SuggestionManager.refresh();
}

async function start(): Promise<void> {
  const savedTeams = TeamManager.loadTeams();
  const [heroData, compData] = await Promise.all([API.getHeroesWithRoles(), API.getCompData()]);
  viewState.compData = compData;
  onViewChange(refreshView);

  HeroSelector.populateHeroSelector(heroData);
  TeamManager.updateDropdowns(heroData);
  TeamManager.restoreTeamSelections(savedTeams);
  TeamManager.initSelectionHandlers();

  const restored = await API.restoreTeams(savedTeams);
  if (restored.current_scores || restored.enemy_scores) {
    ScoreManager.updateTeamScores({
      current_scores: restored.current_scores,
      enemy_scores: restored.enemy_scores,
    });
  }

  const bar = document.querySelector<HTMLElement>('.app-header');
  if (bar) await MatchContextBar.init(bar, loadContext());
}

function trackHeaderHeight(): void {
  const header = document.querySelector<HTMLElement>('.app-header');
  if (!header) return;
  const update = () => {
    document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
  };
  new ResizeObserver(update).observe(header);
  update();
}

renderTeamRows();
bindClearButtons();
trackHeaderHeight();
window.addEventListener('load', () => {
  start().catch((error: unknown) => {
    console.error('Error initializing application:', error);
    showStatus('Could not reach the counter API. Start it with "python main.py --serve" and reload.');
  });
});
