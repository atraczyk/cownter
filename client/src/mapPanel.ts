import { ARCHETYPES, ARCHETYPE_LABELS, dominant, findMap, findMode, percent, pointPreference } from './compFit';
import type { Side } from './types';
import { viewState } from './viewState';

const SIDE_LABELS: Record<Side, string> = { attack: 'Attacking', defense: 'Defending' };

/** The point's comp mix, kept under the hero pool so the bright icons have a key. */
export const MapPanel = {
  render(): void {
    const panel = document.querySelector('.map-panel');
    const data = viewState.compData;
    if (!panel || !data) return;

    const where = panel.querySelector('[data-part="where"]');
    const detail = panel.querySelector('[data-part="detail"]');
    const mix = panel.querySelector('[data-part="mix"]');
    const note = panel.querySelector('[data-part="note"]');
    const bar = panel.querySelector<HTMLElement>('[data-part="bar"]');

    const { context } = viewState;
    const mode = findMode(data, context.mode);
    const map = findMap(data, context.map);
    const point = map?.points.find((entry) => entry.id === context.point);
    const preference = pointPreference(data, context);

    if (where) where.textContent = map?.name ?? 'No map selected';
    if (detail) {
      const parts = [mode?.name, point?.name, context.side ? SIDE_LABELS[context.side] : null].filter(Boolean);
      detail.textContent = parts.join(' · ');
    }

    if (bar) {
      bar.hidden = !preference;
      if (preference) {
        ARCHETYPES.forEach((archetype) => {
          const segment = bar.querySelector<HTMLElement>(`[data-arch="${archetype}"]`);
          if (segment) segment.style.flexGrow = String(Math.round(preference[archetype] * 100));
        });
      }
    }

    if (mix) {
      mix.textContent = preference
        ? ARCHETYPES.map((archetype) => `${ARCHETYPE_LABELS[archetype]} ${percent(preference[archetype])}`).join(' · ')
        : '';
    }
    if (note) {
      note.textContent = preference
        ? data.archetypes.descriptions[dominant(preference)]
        : map
          ? 'Choose a point to see what this map favors.'
          : 'Choose a mode, map and point to see what the point favors.';
    }
  },
};
