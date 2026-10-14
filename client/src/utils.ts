import type { HeroesWithRoles, TeamName } from './types';

export function getHeroIcon(hero: string | null | undefined): string {
  if (!hero) return '';
  return `/resources/images/icons/icon-${hero.toLowerCase()}.png`;
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

export function iconList(heroes: readonly string[] | undefined, className: string): string {
  return (heroes ?? [])
    .map((hero) => `<div class="${className}" style="background-image: url('${getHeroIcon(hero)}')"></div>`)
    .join('');
}
