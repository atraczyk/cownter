import { ARCHETYPES, ARCHETYPE_LABELS, dominant, percent, pointPreference, signed } from './compFit';
import { heroLabel, setTip, type Tip } from './tooltip';
import type { CompWeights, Side } from './types';
import { viewState } from './viewState';

export interface Breakdown {
  counters: number;
  synergy: number;
  fit: number;
}

const SYNERGY_POINTS = 0.5;

const round = (value: number) => Math.round(value * 10) / 10;
const names = (heroes: readonly string[]) => heroes.map(heroLabel).join(', ');
const plus = (value: number) => `+${round(value)}`;

/** Split a row score into its parts; map fit is whatever counters and synergy don't explain. */
export function breakdown(score: number, countered: readonly string[] = [], partners: readonly string[] = []): Breakdown {
  const counters = countered.length;
  const synergy = partners.length * SYNERGY_POINTS;
  return { counters, synergy, fit: round(score - counters - synergy) };
}

export function rowScoreTip(
  hero: string,
  score: number,
  countered: readonly string[] = [],
  partners: readonly string[] = [],
  fitApplies: boolean,
): Tip {
  const parts = breakdown(score, countered, partners);
  return {
    title: `${heroLabel(hero)} · ${score}`,
    rows: [
      ['Counters', countered.length ? `${plus(parts.counters)}  ${names(countered)}` : '+0'],
      ['Synergy', partners.length ? `${plus(parts.synergy)}  ${names(partners)}` : '+0'],
      ['Map fit', fitApplies ? signed(parts.fit) : 'pick a point'],
    ],
  };
}

export function totalTip(label: string, total: number, parts: Breakdown[], fitApplies: boolean): Tip {
  const sum = (key: keyof Breakdown) => parts.reduce((acc, part) => acc + part[key], 0);
  return {
    title: `${label} · ${total}`,
    rows: [
      ['Counters', plus(sum('counters'))],
      ['Synergy', plus(sum('synergy'))],
      ['Map fit', fitApplies ? signed(round(sum('fit'))) : 'pick a point'],
    ],
    note: `Sum of the rows. Each synergy pair gives both heroes +${SYNERGY_POINTS}.`,
  };
}

export function relationTip(element: HTMLElement, kind: 'counters' | 'synergy', heroes: readonly string[] = []): void {
  setTip(element, heroes.length
    ? { title: kind === 'counters' ? 'Strong against' : 'Synergy with', note: names(heroes) }
    : null);
}

function mix(weights: CompWeights): string {
  return ARCHETYPES.map((archetype) => `${ARCHETYPE_LABELS[archetype]} ${percent(weights[archetype])}`).join(' · ');
}

/** Tooltip for a hero's comp-type chip; `side` is the side this hero plays on sided modes. */
export function fitTip(hero: string, fit: number | undefined, side: Side | null): Tip | null {
  const data = viewState.compData;
  const weights = data?.archetypes.heroes[hero];
  if (!data || !weights) return null;

  const archetype = dominant(weights);
  const tip: Tip = {
    title: `${heroLabel(hero)} · mostly ${ARCHETYPE_LABELS[archetype].toLowerCase()}`,
    rows: [['Plays', mix(weights)]],
  };
  const point = pointPreference(data, { ...viewState.context, side });
  if (point && fit !== undefined) {
    tip.rows?.push(['Point', mix(point)]);
    tip.rows?.push(['Fit', signed(fit)]);
  } else {
    tip.note = 'Pick a mode, map and point to see how well this hero fits.';
  }
  return tip;
}

export function enemySide(): Side | null {
  const { side } = viewState.context;
  if (!side) return null;
  return side === 'attack' ? 'defense' : 'attack';
}
