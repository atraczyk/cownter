import {
  ARCHETYPE_LABELS,
  ARCHETYPES,
  dominant,
  findMap,
  percent,
  pointPreference,
  signed,
  teamLean,
  ternaryPoint,
  type Vec,
} from './compFit';
import type { Tip } from './tooltip';
import type { Archetype, CompWeights } from './types';
import { getSelectedHeroes } from './utils';
import { viewState } from './viewState';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CORNERS: Record<Archetype, Vec> = {
  dive: { x: 150, y: 34 },
  poke: { x: 38, y: 228 },
  brawl: { x: 262, y: 228 },
};
const LABEL_OFFSET: Record<Archetype, Vec> = {
  dive: { x: 0, y: -14 },
  poke: { x: -6, y: 26 },
  brawl: { x: 6, y: 26 },
};

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function polygon(points: Vec[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function leanText(weights: CompWeights | null, empty: string): string {
  if (!weights) return empty;
  const top = dominant(weights);
  return `${ARCHETYPE_LABELS[top]} ${percent(weights[top])}`;
}

function mixTip(title: string, weights: CompWeights): string {
  const tip: Tip = {
    title: `${title} · ${leanText(weights, '')}`,
    rows: ARCHETYPES.map((archetype) => [ARCHETYPE_LABELS[archetype], percent(weights[archetype])]),
  };
  return JSON.stringify(tip);
}

function drawTriangle(map: CompWeights | null, yours: CompWeights | null, enemy: CompWeights | null): SVGSVGElement {
  const root = svg('svg', { viewBox: '0 0 300 262', role: 'img', class: 'compass-svg' });
  const corners = ARCHETYPES.map((archetype) => CORNERS[archetype]);
  root.append(svg('polygon', { points: polygon(corners), class: 'compass-frame' }));

  [0.25, 0.5, 0.75].forEach((share) => {
    ARCHETYPES.forEach((archetype, index) => {
      const next = ARCHETYPES[(index + 1) % 3];
      const other = ARCHETYPES[(index + 2) % 3];
      const from = ternaryPoint({ [archetype]: share, [next]: 1 - share, [other]: 0 } as CompWeights, CORNERS);
      const to = ternaryPoint({ [archetype]: share, [other]: 1 - share, [next]: 0 } as CompWeights, CORNERS);
      root.append(svg('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: 'compass-grid' }));
    });
  });

  ARCHETYPES.forEach((archetype) => {
    const corner = CORNERS[archetype];
    const offset = LABEL_OFFSET[archetype];
    const label = svg('text', {
      x: corner.x + offset.x,
      y: corner.y + offset.y,
      class: `compass-label arch-${archetype}`,
      'text-anchor': archetype === 'dive' ? 'middle' : archetype === 'poke' ? 'start' : 'end',
    });
    label.textContent = ARCHETYPE_LABELS[archetype].toUpperCase();
    root.append(label);
  });

  if (map) {
    const at = ternaryPoint(map, CORNERS);
    root.append(svg('circle', { cx: at.x, cy: at.y, r: 26, class: 'compass-zone' }));
    const marker = svg('rect', { x: at.x - 7, y: at.y - 7, width: 14, height: 14, class: 'marker-map', transform: `rotate(45 ${at.x} ${at.y})` });
    marker.setAttribute('data-tip', mixTip('This point favors', map));
    root.append(marker);
  }

  const dots: Array<[CompWeights | null, string, string]> = [
    [enemy, 'marker-enemy', 'Enemy team'],
    [yours, 'marker-yours', 'Your team'],
  ];
  dots.forEach(([weights, className, label]) => {
    if (!weights) return;
    const at = ternaryPoint(weights, CORNERS);
    const dot = svg('circle', { cx: at.x, cy: at.y, r: 8, class: className });
    dot.setAttribute('data-tip', mixTip(label, weights));
    root.append(dot);
  });

  root.setAttribute(
    'aria-label',
    `Map point ${leanText(map, 'not set')}, your team ${leanText(yours, 'empty')}, enemy ${leanText(enemy, 'empty')}`,
  );
  return root;
}

function averageFit(heroes: string[]): number | null {
  const fits = heroes.map((hero) => viewState.mapFit[hero]).filter((value): value is number => value !== undefined);
  if (fits.length === 0) return null;
  return fits.reduce((total, value) => total + value, 0) / fits.length;
}

export const Compass = {
  render(): void {
    const card = document.querySelector('.compass-card');
    const data = viewState.compData;
    if (!card || !data) return;

    const heroWeights = data.archetypes.heroes;
    const preference = pointPreference(data, viewState.context);
    const yourHeroes = getSelectedHeroes('counter');
    const yours = teamLean(heroWeights, yourHeroes);
    const enemy = teamLean(heroWeights, getSelectedHeroes('enemy'));

    const map = findMap(data, viewState.context.map);
    const point = map?.points.find((entry) => entry.id === viewState.context.point);
    const heading = card.querySelector('[data-part="where"]');
    if (heading) {
      heading.textContent = map && point ? `${map.name} · ${point.name}` : 'No map selected';
    }

    const plot = card.querySelector('[data-part="plot"]');
    plot?.replaceChildren(drawTriangle(preference, yours, enemy));

    const fit = averageFit(yourHeroes);
    const readouts: Array<[string, string, string]> = [
      ['marker-map', 'This point favors', preference ? leanText(preference, '') : 'Pick a map and point'],
      ['marker-yours', 'Your team', leanText(yours, 'No picks yet')],
      ['marker-enemy', 'Enemy team', leanText(enemy, 'No picks yet')],
    ];
    const legend = card.querySelector('[data-part="legend"]');
    legend?.replaceChildren(
      ...readouts.map(([marker, label, value]) => {
        const row = document.createElement('div');
        row.className = 'legend-row';
        row.innerHTML = `<span class="legend-key ${marker}"></span><span class="legend-label">${label}</span><span class="legend-value">${value}</span>`;
        return row;
      }),
    );

    const verdict = card.querySelector('[data-part="verdict"]');
    if (verdict) {
      verdict.textContent = preference && fit !== null
        ? `Your picks fit this point ${signed(fit)} per hero`
        : preference
          ? 'Add heroes to your team to see how well they fit this point.'
          : 'Choose a mode, map and point to weigh suggestions by comp type.';
      verdict.className = `compass-verdict${fit !== null && preference ? (fit >= 0 ? ' is-good' : ' is-bad') : ''}`;
    }
  },
};
