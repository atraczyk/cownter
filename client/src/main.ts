import { API } from './api';
import { Compass } from './compass';
import { paintTeamFitChips } from './fitChip';
import { HeroSelector } from './heroSelector';
import { HeroPicker } from './heroPicker';
import { MapPanel } from './mapPanel';
import { MatchContextBar, randomContext } from './matchContext';
import { ScoreManager } from './scoreManager';
import { SuggestionManager } from './suggestionManager';
import { renderTeamRows } from './teamRows';
import { pageTeams, showStatus, TeamManager } from './teamManager';
import { initTooltips } from './tooltip';
import { contextPopulated, loadContext, onViewChange, viewState } from './viewState';

function bindAbout(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-part="about"]');
  const open = document.querySelector<HTMLButtonElement>('[data-part="help"]');
  if (!dialog || !open) return;
  open.addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

function bindClearButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-clear-team]').forEach((button) => {
    button.addEventListener('click', () => {
      const team = button.dataset.clearTeam;
      if (team === 'enemy' || team === 'counter') {
        TeamManager.clearTeam(team);
      }
    });
  });
  document.querySelector<HTMLButtonElement>('.link-toggle')?.addEventListener('click', () => {
    SuggestionManager.setLinked(!SuggestionManager.linked);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-randomize-team]').forEach((button) => {
    button.addEventListener('click', () => {
      const team = button.dataset.randomizeTeam;
      if (team === 'enemy' || team === 'counter') TeamManager.randomizeTeam(team);
    });
  });
}

function refreshView(): void {
  Compass.render();
  MapPanel.render();
  paintTeamFitChips();
  HeroSelector.paintFit();
  SuggestionManager.refresh();
}

async function start(): Promise<void> {
  const [heroData, compData] = await Promise.all([API.getHeroesWithRoles(), API.getCompData()]);
  viewState.compData = compData;
  onViewChange(refreshView);

  HeroSelector.populateHeroSelector(heroData);
  TeamManager.updateDropdowns(heroData);

  const savedTeams = TeamManager.loadTeams();
  const teams = {
    counter: TeamManager.teamPopulated(savedTeams.counter) ? savedTeams.counter : TeamManager.randomLineup('counter'),
    enemy: TeamManager.teamPopulated(savedTeams.enemy) ? savedTeams.enemy : TeamManager.randomLineup('enemy'),
  };
  TeamManager.restoreTeamSelections(teams);
  TeamManager.saveTeams(pageTeams());
  TeamManager.initSelectionHandlers();
  HeroPicker.init();

  const restored = await API.restoreTeams(pageTeams());
  if (restored.current_scores || restored.enemy_scores) {
    ScoreManager.updateTeamScores({
      current_scores: restored.current_scores,
      enemy_scores: restored.enemy_scores,
    });
  }

  const savedContext = loadContext();
  const bar = document.querySelector<HTMLElement>('.app-header');
  if (bar) await MatchContextBar.init(bar, contextPopulated(savedContext) ? savedContext : randomContext(compData));
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
bindAbout();
bindClearButtons();
trackHeaderHeight();
initTooltips();
// Reveal the populated layout once fonts have settled, so startup and font
// loading cannot move controls that the user has already started reading.
void start()
  .then(async () => {
    // Populating the panels introduces additional font weights. Flush layout
    // before observing font readiness so those loads are included as well.
    void document.body.offsetHeight;
    await document.fonts.ready;
  })
  .catch((error: unknown) => {
    console.error('Error initializing application:', error);
    showStatus('Could not load the hero data. Reload the page to try again.');
  })
  .finally(() => {
    const header = document.querySelector<HTMLElement>('.app-header');
    if (header) document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
    requestAnimationFrame(() => document.body.classList.remove('app-loading'));
  });
