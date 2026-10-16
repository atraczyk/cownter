import { ARCHETYPES, ARCHETYPE_LABELS, dominant, findMap, findMode, percent, pointPreference } from './compFit';
import type { Side } from './types';
import { asset } from './utils';
import { viewState } from './viewState';

const SIDE_LABELS: Record<Side, string> = { attack: 'Attacking', defense: 'Defending' };

/** Map identity and composition guidance within the team analysis. */
export const MapPanel = {
  render(): void {
    const panel = document.querySelector('.map-panel');
    const data = viewState.compData;
    if (!panel || !data) return;

    const thumb = panel.querySelector<HTMLImageElement>('[data-part="thumb"]');
    const where = panel.querySelector('[data-part="where"]');
    const detail = panel.querySelector('[data-part="detail"]');
    const analysis = document.querySelector('.map-analysis');
    const mix = analysis?.querySelector('[data-part="mix"]');
    const note = analysis?.querySelector('[data-part="note"]');
    const bar = analysis?.querySelector<HTMLElement>('[data-part="bar"]');

    const { context } = viewState;
    const mode = findMode(data, context.mode);
    const map = findMap(data, context.map);
    const point = map?.points.find((entry) => entry.id === context.point);
    const preference = pointPreference(data, context);

    if (thumb) {
      thumb.hidden = !map;
      thumb.onerror = () => { thumb.hidden = true; };
      if (map) {
        thumb.src = asset(`/resources/images/maps/${map.id}.jpg`);
        thumb.alt = map.name;
      } else {
        thumb.removeAttribute('src');
        thumb.alt = '';
      }
    }
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
