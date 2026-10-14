import { ARCHETYPE_LABELS, dominant, signed } from './compFit';
import type { HeroesWithRoles, TeamName } from './types';
import { getHeroIcon, getSelectedHeroes } from './utils';
import { viewState } from './viewState';

export const HeroSelector = {
  draggedHero: null as string | null,
  draggedRole: null as string | null,

  /** Mark each pool icon with its comp type and, when a map point is set, its fit there. */
  paintFit(): void {
    const weights = viewState.compData?.archetypes.heroes ?? {};
    document.querySelectorAll<HTMLElement>('.hero-icon-select').forEach((icon) => {
      const hero = icon.dataset.hero ?? '';
      const heroWeights = weights[hero];
      const fit = viewState.mapFit[hero];
      icon.classList.remove('fits', 'misfits', 'arch-dive', 'arch-poke', 'arch-brawl');
      if (!heroWeights) {
        icon.title = hero;
        return;
      }
      const archetype = dominant(heroWeights);
      icon.classList.add(`arch-${archetype}`);
      if (fit !== undefined) icon.classList.add(fit > 0.1 ? 'fits' : fit < -0.1 ? 'misfits' : 'neutral');
      icon.title = fit === undefined
        ? `${hero} · ${ARCHETYPE_LABELS[archetype]}`
        : `${hero} · ${ARCHETYPE_LABELS[archetype]} · ${signed(fit)} on this point`;
    });
  },

  populateHeroSelector(heroData: HeroesWithRoles): void {
    Object.entries(heroData).sort(([a], [b]) => a.localeCompare(b)).forEach(([hero, data]) => {
      const section = document.querySelector(`.role-section[data-role="${data.role}"] .hero-grid`);
      if (!section) return;

      const heroIcon = document.createElement('div');
      heroIcon.className = 'hero-icon-select';
      heroIcon.style.backgroundImage = `url('${getHeroIcon(hero)}')`;
      heroIcon.setAttribute('data-hero', hero);
      heroIcon.setAttribute('data-role', data.role);
      heroIcon.draggable = true;
      section.appendChild(heroIcon);
    });

    this.setupDragAndDrop();
  },

  setupDragAndDrop(): void {
    const selector = document.querySelector('.hero-selector');
    if (!selector) return;

    selector.addEventListener('dragstart', (event) => {
      if (!(event instanceof DragEvent) || !event.dataTransfer) return;
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches('.hero-icon-select')) return;

      target.classList.add('dragging');
      this.draggedHero = target.dataset.hero ?? null;
      this.draggedRole = target.dataset.role ?? null;
      if (this.draggedHero) event.dataTransfer.setData('text/plain', this.draggedHero);
      if (this.draggedRole) event.dataTransfer.setData('hero-role', this.draggedRole);
    });

    selector.addEventListener('dragend', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches('.hero-icon-select')) return;

      target.classList.remove('dragging');
      this.draggedHero = null;
      this.draggedRole = null;
      document.querySelectorAll('.player-row').forEach((row) => {
        row.classList.remove('drop-hover', 'invalid-drop');
      });
    });

    document.querySelectorAll<HTMLElement>('.player-row').forEach((row) => {
      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (!event.dataTransfer) return;

        const select = row.querySelector<HTMLSelectElement>('.hero-select');
        if (!select) return;

        const targetRole = select.dataset.role;
        const targetTeam = select.dataset.team as TeamName | undefined;
        const isValidRole = this.draggedRole === targetRole;
        const isDuplicate = Boolean(
          targetTeam && this.draggedHero && getSelectedHeroes(targetTeam).includes(this.draggedHero),
        );

        event.dataTransfer.dropEffect = 'move';
        if (isValidRole && !isDuplicate) {
          row.classList.add('drop-hover');
          row.classList.remove('invalid-drop');
        } else {
          row.classList.remove('drop-hover');
          row.classList.add('invalid-drop');
          event.dataTransfer.dropEffect = 'none';
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drop-hover', 'invalid-drop');
      });

      row.addEventListener('drop', (event) => {
        event.preventDefault();
        row.classList.remove('drop-hover', 'invalid-drop');
        if (!event.dataTransfer) return;

        const hero = event.dataTransfer.getData('text/plain');
        const heroRole = event.dataTransfer.getData('hero-role');
        const select = row.querySelector<HTMLSelectElement>('.hero-select');
        const team = select?.dataset.team as TeamName | undefined;

        if (
          select &&
          team &&
          heroRole === select.dataset.role &&
          !getSelectedHeroes(team).includes(hero)
        ) {
          select.value = hero;
          select.dispatchEvent(new Event('change'));
        }
      });
    });
  },
};
