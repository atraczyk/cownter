import { paintFitChip } from './fitChip';
import type { HeroScore, Role, Suggestions } from './types';
import { getHeroIcon, heroTotalScore, iconList } from './utils';

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

function suggestionRow(role: Role, heroData: HeroScore, score: number): HTMLDivElement {
  const [hero, , counteredHeroes, synergizingHeroes] = heroData;
  const row = document.createElement('div');
  row.className = 'player-row';
  row.innerHTML = `
    <div class="role-icon role-${role}"></div>
    <div class="hero-icon" style="background-image: url('${getHeroIcon(hero)}')"></div>
    <div class="hero-name">${hero}</div>
    <div class="fit-chip"></div>
    <div class="score-section">
      <div class="score">${score}</div>
      <div class="countered-heroes">${iconList(counteredHeroes, 'countered-hero-icon')}</div>
      <div class="synergizing-heroes">${iconList(synergizingHeroes, 'synergizing-hero-icon')}</div>
    </div>
  `;
  const chip = row.querySelector<HTMLElement>('.fit-chip');
  if (chip) paintFitChip(chip, hero);
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
    headerContainer.appendChild(header);

    const note = document.createElement('span');
    note.className = 'board-note';
    note.textContent = suggestions.map_fit ? 'Counters + synergy + map fit' : 'Counters + synergy';
    headerContainer.appendChild(note);
    content.appendChild(headerContainer);

    const slotCounts: Record<Role, number> = { tank: 0, damage: 0, support: 0 };

    ROLES.forEach((role) => {
      roleSuggestions(suggestions, role).forEach((heroData) => {
        content.appendChild(suggestionRow(role, heroData, rowScore(suggestions, heroData)));
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
    score.setAttribute('data-score', String(Math.round(totalScore * 10) / 10));
    content.appendChild(score);

    block.appendChild(content);
    return block;
  },
};
