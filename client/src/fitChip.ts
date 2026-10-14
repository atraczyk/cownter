import { ARCHETYPE_LABELS, dominant, signed } from './compFit';
import { viewState } from './viewState';

/** Fill a chip with the hero's main comp type and, when a map point is set, its fit there. */
export function paintFitChip(chip: HTMLElement, hero: string | null): void {
  const weights = hero ? viewState.compData?.archetypes.heroes[hero] : undefined;
  if (!hero || !weights) {
    chip.className = 'fit-chip';
    chip.textContent = '';
    chip.removeAttribute('title');
    return;
  }

  const archetype = dominant(weights);
  const fit = viewState.mapFit[hero];
  chip.className = `fit-chip arch-${archetype}${fit === undefined ? '' : fit >= 0 ? ' fits' : ' misfits'}`;
  chip.textContent = fit === undefined ? ARCHETYPE_LABELS[archetype] : `${ARCHETYPE_LABELS[archetype]} ${signed(fit)}`;
  chip.title = fit === undefined
    ? `Mostly a ${ARCHETYPE_LABELS[archetype].toLowerCase()} hero`
    : `Mostly a ${ARCHETYPE_LABELS[archetype].toLowerCase()} hero, ${signed(fit)} fit on this point`;
}

export function paintTeamFitChips(): void {
  document.querySelectorAll<HTMLSelectElement>('.hero-select').forEach((select) => {
    const chip = select.closest('.player-row')?.querySelector<HTMLElement>('.fit-chip');
    if (chip) paintFitChip(chip, select.value || null);
  });
}
