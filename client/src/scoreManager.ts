import type { HeroScore, ScoreUpdate } from './types';
import { iconList } from './utils';

function paintHeroScore(select: HTMLSelectElement, entry: HeroScore, scoreClass: string): void {
  const [, score, counteredHeroes, synergizingHeroes] = entry;
  const row = select.closest('.player-row');
  if (!row) return;

  const scoreDiv = row.querySelector<HTMLElement>(scoreClass);
  const counteredDiv = row.querySelector<HTMLElement>('.countered-heroes');
  const synergizingDiv = row.querySelector<HTMLElement>('.synergizing-heroes');

  if (scoreDiv) scoreDiv.textContent = String(score);
  if (counteredDiv && counteredHeroes) {
    counteredDiv.innerHTML = iconList(counteredHeroes, 'countered-hero-icon');
  }
  if (synergizingDiv && synergizingHeroes) {
    synergizingDiv.innerHTML = iconList(synergizingHeroes, 'synergizing-hero-icon');
  }
}

function clearTeamDisplay(team: 'counter' | 'enemy', scoreClass: string, totalSelector: string): void {
  document.querySelectorAll<HTMLSelectElement>(`.hero-select[data-team="${team}"]`).forEach((select) => {
    const row = select.closest('.player-row');
    if (!row) return;
    const score = row.querySelector(scoreClass);
    const countered = row.querySelector('.countered-heroes');
    const synergizing = row.querySelector('.synergizing-heroes');
    if (score) score.textContent = '';
    if (countered) countered.innerHTML = '';
    if (synergizing) synergizing.innerHTML = '';
  });

  const total = document.querySelector(totalSelector);
  if (total) total.textContent = '';
}

function applyScores(
  heroes: HeroScore[],
  team: 'counter' | 'enemy',
  scoreClass: string,
  totalSelector: string,
  totalScore: number,
): void {
  heroes.forEach((entry) => {
    const hero = entry[0];
    const selects = document.querySelectorAll<HTMLSelectElement>(`.hero-select[data-team="${team}"]`);
    const select = Array.from(selects).find((item) => item.value.toLowerCase() === hero.toLowerCase());
    if (select) paintHeroScore(select, entry, scoreClass);
  });

  const total = document.querySelector(totalSelector);
  if (total) total.setAttribute('data-score', String(totalScore));
}

export const ScoreManager = {
  updateTeamScores(scores: ScoreUpdate | null | undefined): void {
    if (!scores) return;

    if (scores.current_scores) {
      clearTeamDisplay('counter', '.current-score', '.team.blue-team .total-score-display');
    }
    if (scores.enemy_scores) {
      clearTeamDisplay('enemy', '.enemy-score', '.team.red-team .total-score-display');
    }

    if (scores.current_scores) {
      applyScores(
        scores.current_scores.heroes,
        'counter',
        '.current-score',
        '.team.blue-team .total-score-display',
        scores.current_scores.total_score,
      );
    }

    if (scores.enemy_scores) {
      applyScores(
        scores.enemy_scores.heroes,
        'enemy',
        '.enemy-score',
        '.team.red-team .total-score-display',
        scores.enemy_scores.total_score,
      );
    }
  },
};
