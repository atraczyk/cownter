import type { HeroScore, Role, Suggestions } from './types';
import { getHeroIcon, heroTotalScore, iconList } from './utils';

const ROLES: Role[] = ['tank', 'damage', 'support'];
const MAX_SLOTS: Record<Role, number> = { tank: 1, damage: 2, support: 2 };

function roleSuggestions(suggestions: Suggestions, role: Role): HeroScore[] {
  const heroes = suggestions[role];
  return Array.isArray(heroes) ? heroes : [];
}

function suggestionRow(role: Role, heroData: HeroScore): HTMLDivElement {
  const [hero, counterScore, counteredHeroes, synergizingHeroes] = heroData;
  const row = document.createElement('div');
  row.className = 'player-row';
  row.innerHTML = `
    <div class="role-icon role-${role}"></div>
    <div class="hero-icon" style="background-image: url('${getHeroIcon(hero)}')"></div>
    <div style="font-weight: bold;">${hero}</div>
    <div class="score-section">
      <div class="score">${heroTotalScore(counterScore, synergizingHeroes)}</div>
      <div class="countered-heroes">${iconList(counteredHeroes, 'countered-hero-icon')}</div>
      <div class="synergizing-heroes">${iconList(synergizingHeroes, 'synergizing-hero-icon')}</div>
    </div>
  `;
  return row;
}

export const SuggestionManager = {
  updateCounterSuggestions(suggestions: Suggestions | null | undefined): void {
    if (!suggestions) return;

    const hasHeroes = ROLES.some((role) => roleSuggestions(suggestions, role).length > 0);
    if (!hasHeroes) return;

    const rightColumn = document.querySelector('.right-column');
    if (!rightColumn) return;

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

    const header = document.createElement('div');
    header.className = 'team-header';
    header.textContent = 'SUGGESTED PICKS';
    headerContainer.appendChild(header);
    content.appendChild(headerContainer);

    const slotCounts: Record<Role, number> = { tank: 0, damage: 0, support: 0 };

    ROLES.forEach((role) => {
      roleSuggestions(suggestions, role).forEach((heroData) => {
        content.appendChild(suggestionRow(role, heroData));
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
        return roleTotal + heroTotalScore(entry[1], entry[3]);
      }, 0);
    }, 0);

    const score = document.createElement('div');
    score.className = 'total-score-display';
    score.setAttribute('data-score', String(totalScore));
    content.appendChild(score);

    block.appendChild(content);
    return block;
  },
};
