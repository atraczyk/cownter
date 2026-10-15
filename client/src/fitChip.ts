import { ARCHETYPE_LABELS, dominant, signed } from './compFit';
import { enemySide, fitTip } from './scoreTips';
import { setTip } from './tooltip';
import { viewState } from './viewState';

/** Fill a chip with the hero's main comp type and, when a map point is set, its fit there. */
export function paintFitChip(chip: HTMLElement, hero: string | null, team: 'counter' | 'enemy' = 'counter'): void {
  const weights = hero ? viewState.compData?.archetypes.heroes[hero] : undefined;
  if (!hero || !weights) {
    chip.className = 'fit-chip';
    chip.textContent = '';
    setTip(chip, null);
    return;
  }

  const enemy = team === 'enemy';
  const fit = (enemy ? viewState.enemyMapFit : viewState.mapFit)[hero];
  const archetype = dominant(weights);
  chip.className = `fit-chip arch-${archetype}${fit === undefined ? '' : fit >= 0 ? ' fits' : ' misfits'}`;
  chip.textContent = fit === undefined ? ARCHETYPE_LABELS[archetype] : `${ARCHETYPE_LABELS[archetype]} ${signed(fit)}`;
  setTip(chip, fitTip(hero, fit, enemy ? enemySide() : viewState.context.side));
}

export function paintTeamFitChips(): void {
  document.querySelectorAll<HTMLSelectElement>('.hero-select').forEach((select) => {
    const chip = select.closest('.player-row')?.querySelector<HTMLElement>('.fit-chip');
    const team = select.dataset.team === 'enemy' ? 'enemy' : 'counter';
    if (chip) paintFitChip(chip, select.value || null, team);
  });
}
