import { paintFitChip } from './fitChip';
import { breakdown, relationTip, rowScoreTip, totalTip } from './scoreTips';
import { setTip } from './tooltip';
import type { HeroScore, Role, Suggestions } from './types';
import { getHeroIcon, heroTotalScore, iconList } from './utils';

const HOW_PICKS_WORK = {
  title: 'How picks are chosen',
  rows: [
    ['Counters', '+1 per enemy hero countered'],
    ['Synergy', '+0.5 per teammate it pairs with'],
    ['Map fit', 'comp-type match with your side of the point'],
  ] as [string, string][],
  note: 'The best 1 tank, 2 damage, 2 support team from the top candidates in each role.',
};

const ROLES: Role[] = ['tank', 'damage', 'support'];
const MAX_SLOTS: Record<Role, number> = { tank: 1, damage: 2, support: 2 };

function roleSuggestions(suggestions: Suggestions, role: Role): HeroScore[] {
  const heroes = suggestions[role];
  return Array.isArray(heroes) ? heroes : [];
}

function rowScore(suggestions: Suggestions, heroData: HeroScore): number {
  const [hero, counterScore, , synergizingHeroes] = heroData;
  const fit = suggestions.map_fit?.[hero] ?? 0;
  return Math.round((heroTotalScore(counterScore, synergizingHeroes) + fit) * 10) / 10;
}

function suggestionRow(role: Role, heroData: HeroScore, score: number, fitApplies: boolean): HTMLDivElement {
  const [hero, , counteredHeroes, synergizingHeroes] = heroData;
  const row = document.createElement('div');
  row.className = 'player-row';
  row.innerHTML = `
    <div class="role-icon role-${role}"></div>
    <div class="hero-icon" style="background-image: url('${getHeroIcon(hero)}')"></div>
    <div class="hero-name">${hero}</div>
    <div class="fit-chip"></div>
    <div class="score-section">
      <div class="countered-heroes">${iconList(counteredHeroes, 'countered-hero-icon')}</div>
      <div class="synergizing-heroes">${iconList(synergizingHeroes, 'synergizing-hero-icon')}</div>
      <div class="score">${score}</div>
    </div>
  `;
  const chip = row.querySelector<HTMLElement>('.fit-chip');
  if (chip) paintFitChip(chip, hero);
  const scoreDiv = row.querySelector<HTMLElement>('.score');
  if (scoreDiv) setTip(scoreDiv, rowScoreTip(hero, score, counteredHeroes, synergizingHeroes, fitApplies));
  const counteredDiv = row.querySelector<HTMLElement>('.countered-heroes');
  if (counteredDiv) relationTip(counteredDiv, 'counters', counteredHeroes);
  const synergizingDiv = row.querySelector<HTMLElement>('.synergizing-heroes');
  if (synergizingDiv) relationTip(synergizingDiv, 'synergy', synergizingHeroes);
  return row;
}

export const SuggestionManager = {
  latest: null as Suggestions | null,

  /** Repaint the current suggestions, e.g. after map fit changes. */
  refresh(): void {
    if (this.latest) this.updateCounterSuggestions(this.latest);
  },

  clear(): void {
    this.latest = null;
    const rightColumn = document.querySelector('.right-column');
    if (rightColumn) rightColumn.innerHTML = '';
  },

  updateCounterSuggestions(suggestions: Suggestions | null | undefined): void {
    if (!suggestions) return;

    const hasHeroes = ROLES.some((role) => roleSuggestions(suggestions, role).length > 0);
    if (!hasHeroes) return;

    const rightColumn = document.querySelector('.right-column');
    if (!rightColumn) return;

    this.latest = suggestions;
    rightColumn.innerHTML = '';
    rightColumn.appendChild(this.createSuggestionBlock(suggestions));
  },

  createSuggestionBlock(suggestions: Suggestions): HTMLElement {
    const block = document.createElement('div');
    block.className = 'scoreboard';

    const content = document.createElement('div');
    content.className = 'suggestion-block';

    const headerContainer = document.createElement('div');
    headerContainer.className = 'team-header-container';

    const header = document.createElement('h2');
    header.className = 'team-header';
    header.textContent = 'Suggested picks';

    const info = document.createElement('button');
    info.type = 'button';
    info.className = 'info-badge';
    info.textContent = 'i';
    info.setAttribute('aria-label', 'How picks are chosen');
    setTip(info, {
      ...HOW_PICKS_WORK,
      rows: suggestions.map_fit
        ? HOW_PICKS_WORK.rows
        : [...HOW_PICKS_WORK.rows.slice(0, 2), ['Map fit', 'pick a point to include it']],
    });
    const title = document.createElement('div');
    title.className = 'header-title';
    title.append(header, info);
    headerContainer.appendChild(title);
    content.appendChild(headerContainer);

    const fitApplies = Boolean(suggestions.map_fit);
    const slotCounts: Record<Role, number> = { tank: 0, damage: 0, support: 0 };
    const parts: ReturnType<typeof breakdown>[] = [];

    ROLES.forEach((role) => {
      roleSuggestions(suggestions, role).forEach((heroData) => {
        const score = rowScore(suggestions, heroData);
        parts.push(breakdown(score, heroData[2], heroData[3]));
        content.appendChild(suggestionRow(role, heroData, score, fitApplies));
        slotCounts[role] += 1;
      });

      while (slotCounts[role] < MAX_SLOTS[role]) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'empty-slot';
        content.appendChild(emptySlot);
        slotCounts[role] += 1;
      }
    });

    const totalScore = ROLES.reduce((total, role) => {
      return total + roleSuggestions(suggestions, role).reduce((roleTotal, entry) => {
        return roleTotal + rowScore(suggestions, entry);
      }, 0);
    }, 0);

    const score = document.createElement('div');
    score.className = 'total-score-display';
    const roundedTotal = Math.round(totalScore * 10) / 10;
    score.setAttribute('data-score', String(roundedTotal));
    setTip(score, totalTip('Suggested total', roundedTotal, parts, fitApplies));
    content.appendChild(score);

    block.appendChild(content);
    return block;
  },
};
