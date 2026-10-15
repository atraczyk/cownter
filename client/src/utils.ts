import type { HeroesWithRoles, TeamName } from './types';

/** Site path, including the GitHub Pages base when the app is not served from `/`. */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${path.replace(/^\//, '')}`;
}

export function getHeroIcon(hero: string | null | undefined): string {
  if (!hero) return '';
  return asset(`/resources/images/icons/icon-${hero.toLowerCase()}.png`);
}

export function updateHeroIcon(select: HTMLSelectElement): void {
  const row = select.closest('.player-row');
  const iconDiv = row?.querySelector<HTMLElement>('.hero-icon');
  if (!iconDiv) return;

  const hero = select.value;
  iconDiv.style.backgroundImage = hero ? `url('${getHeroIcon(hero)}')` : 'none';
}

export function getHeroRole(hero: string, heroData: HeroesWithRoles): string {
  return heroData[hero]?.role || 'unknown';
}

export function getSelectedHeroes(team: TeamName): string[] {
  return Array.from(document.querySelectorAll<HTMLSelectElement>(`.hero-select[data-team="${team}"]`))
    .map((select) => select.value)
    .filter(Boolean);
}

export function heroTotalScore(counterScore: number, synergizingHeroes: readonly string[] | undefined): number {
  return counterScore + (synergizingHeroes?.length ?? 0) * 0.5;
}

const ICON_LIMIT = 3;
const ICON_COLLAPSED = 2;

/** Three portraits at most. Four or more collapse to two faces plus a +N. The tooltip lists every name. */
export function iconList(heroes: readonly string[] | undefined, className: string): string {
  const list = heroes ?? [];
  const shown = list.slice(0, list.length > ICON_LIMIT ? ICON_COLLAPSED : list.length);
  const extra = list.length - shown.length;
  const icons = shown
    .map((hero) => `<div class="${className}" style="background-image: url('${getHeroIcon(hero)}')"></div>`)
    .join('');
  return extra > 0 ? `${icons}<span class="icon-more">+${extra}</span>` : icons;
}
