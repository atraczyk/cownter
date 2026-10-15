import { API } from './api';
import { findMap, findMode, mapsForMode } from './compFit';
import { ScoreManager } from './scoreManager';
import { SuggestionManager } from './suggestionManager';
import { pageTeams, showStatus } from './teamManager';
import type { CompData, MatchContext, Side } from './types';
import { emptyContext, notifyViewChange, saveContext, viewState } from './viewState';

const SIDE_LABELS: Record<Side, string> = { attack: 'Attacking', defense: 'Defending' };

function button(label: string, pressed: boolean, onClick: () => void, className: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = label;
  element.setAttribute('aria-pressed', String(pressed));
  element.addEventListener('click', onClick);
  return element;
}

/** Keep only the parts of a saved context that still exist in the data sheets. */
function sanitize(data: CompData, context: MatchContext): MatchContext {
  const mode = findMode(data, context.mode);
  if (!mode) return emptyContext();

  const map = findMap(data, context.map);
  if (!map || map.mode !== mode.id) return { ...emptyContext(), mode: mode.id };

  const point = map.points.find((entry) => entry.id === context.point) ?? map.points[0];
  const side = mode.sided ? (context.side ?? 'attack') : null;
  return { mode: mode.id, map: map.id, point: point.id, side };
}

export const MatchContextBar = {
  root: null as HTMLElement | null,

  async apply(next: MatchContext): Promise<void> {
    const data = viewState.compData;
    if (!data) return;

    viewState.context = sanitize(data, next);
    saveContext(viewState.context);
    this.render();
    notifyViewChange();

    let response;
    try {
      response = await API.setContext(viewState.context, pageTeams());
      showStatus(null);
    } catch {
      showStatus('Could not reach the counter API, so map fit is out of date. Pick the point again to retry.');
      return;
    }
    viewState.mapFit = response.map_fit;
    viewState.enemyMapFit = response.enemy_map_fit;
    if (response.suggestions) SuggestionManager.updateCounterSuggestions(response.suggestions);
    ScoreManager.updateTeamScores(response);
    notifyViewChange();
  },

  selectMode(modeId: string): void {
    const data = viewState.compData;
    if (!data) return;
    const firstMap = mapsForMode(data, modeId)[0];
    void this.apply({ mode: modeId, map: firstMap?.id ?? null, point: null, side: null });
  },

  render(): void {
    const data = viewState.compData;
    const root = this.root;
    if (!data || !root) return;

    const { context } = viewState;
    const mode = findMode(data, context.mode);
    const map = findMap(data, context.map);

    const modes = root.querySelector('[data-part="modes"]');
    const mapField = root.querySelector<HTMLSelectElement>('[data-part="map"]');
    const points = root.querySelector('[data-part="points"]');
    const sides = root.querySelector('[data-part="sides"]');
    if (!modes || !mapField || !points || !sides) return;

    modes.replaceChildren(
      ...data.maps.modes.map((entry) =>
        button(entry.name, entry.id === context.mode, () => this.selectMode(entry.id), 'mode-tab'),
      ),
    );

    mapField.replaceChildren();
    const placeholder = new Option(mode ? 'Choose a map' : 'Choose a mode first', '');
    mapField.append(placeholder);
    mapsForMode(data, context.mode).forEach((entry) => {
      mapField.append(new Option(entry.name, entry.id, false, entry.id === context.map));
    });
    mapField.disabled = !mode;
    mapField.value = context.map ?? '';

    points.replaceChildren(
      ...(map?.points ?? []).map((entry) =>
        button(entry.name, entry.id === context.point, () => {
          void this.apply({ ...viewState.context, point: entry.id });
        }, 'chip'),
      ),
    );

    sides.replaceChildren(
      ...(mode?.sided && map
        ? (Object.keys(SIDE_LABELS) as Side[]).map((side) =>
          button(SIDE_LABELS[side], side === context.side, () => {
            void this.apply({ ...viewState.context, side });
          }, 'chip side-chip'),
        )
        : []),
    );
    const sidesField = root.querySelector('[data-part="sides-field"]') ?? sides;
    sidesField.toggleAttribute('hidden', !(mode?.sided && map));

    const version = root.querySelector('[data-part="version"]');
    if (version) {
      const draft = data.maps.status === 'llm-draft' || data.archetypes.status === 'llm-draft';
      version.textContent = `v${__APP_VERSION__} · ${__GIT_HASH__}`;
      version.setAttribute(
        'title',
        `Map data v${data.maps.version}, comp types v${data.archetypes.version}` +
          (draft ? ' (unreviewed draft)' : ' (reviewed)'),
      );
    }
  },

  async init(root: HTMLElement, saved: MatchContext): Promise<void> {
    this.root = root;
    const mapField = root.querySelector<HTMLSelectElement>('[data-part="map"]');
    mapField?.addEventListener('change', () => {
      void this.apply({ ...viewState.context, map: mapField.value || null, point: null });
    });
    root.querySelector('[data-part="clear"]')?.addEventListener('click', () => {
      void this.apply(emptyContext());
    });
    await this.apply(saved);
  },
};
