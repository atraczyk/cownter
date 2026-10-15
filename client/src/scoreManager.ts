import { breakdown, relationTip, rowScoreTip, totalTip } from './scoreTips';
import { setTip } from './tooltip';
import type { HeroScore, ScoreUpdate } from './types';
import { iconList } from './utils';
import { viewState } from './viewState';

const fitApplies = () => Boolean(viewState.context.point);

function paintHeroScore(select: HTMLSelectElement, entry: HeroScore, scoreClass: string): void {
  const [hero, score, counteredHeroes, synergizingHeroes] = entry;
  const row = select.closest('.player-row');
  if (!row) return;

  const scoreDiv = row.querySelector<HTMLElement>(scoreClass);
  const counteredDiv = row.querySelector<HTMLElement>('.countered-heroes');
  const synergizingDiv = row.querySelector<HTMLElement>('.synergizing-heroes');

  if (scoreDiv) {
    scoreDiv.textContent = String(score);
    setTip(scoreDiv, rowScoreTip(hero, score, counteredHeroes, synergizingHeroes, fitApplies()));
  }
  if (counteredDiv && counteredHeroes) {
    counteredDiv.innerHTML = iconList(counteredHeroes, 'countered-hero-icon');
    relationTip(counteredDiv, 'counters', counteredHeroes);
  }
  if (synergizingDiv && synergizingHeroes) {
    synergizingDiv.innerHTML = iconList(synergizingHeroes, 'synergizing-hero-icon');
    relationTip(synergizingDiv, 'synergy', synergizingHeroes);
  }
}

function clearTeamDisplay(team: 'counter' | 'enemy', scoreClass: string, totalSelector: string): void {
  document.querySelectorAll<HTMLSelectElement>(`.hero-select[data-team="${team}"]`).forEach((select) => {
    const row = select.closest('.player-row');
    if (!row) return;
    row.querySelectorAll<HTMLElement>(`${scoreClass}, .countered-heroes, .synergizing-heroes`).forEach((cell) => {
      cell.innerHTML = '';
      setTip(cell, null);
    });
  });

  const total = document.querySelector<HTMLElement>(totalSelector);
  total?.removeAttribute('data-score');
  if (total) setTip(total, null);
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

  const total = document.querySelector<HTMLElement>(totalSelector);
  if (!total) return;
  total.setAttribute('data-score', String(totalScore));
  const parts = heroes.map(([, score, countered, partners]) => breakdown(score, countered, partners));
  setTip(total, totalTip(team === 'enemy' ? 'Enemy total' : 'Your total', totalScore, parts, fitApplies()));
}

export const ScoreManager = {
  updateTeamScores(scores: ScoreUpdate | null | undefined): void {
    if (!scores) return;

    clearTeamDisplay('counter', '.current-score', '.team.blue-team .total-score-display');
    clearTeamDisplay('enemy', '.enemy-score', '.team.red-team .total-score-display');

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
