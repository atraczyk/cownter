import type { CompData, MatchContext } from './types';

type Listener = () => void;

const CONTEXT_KEY = 'ow2_context';
const listeners = new Set<Listener>();

export const emptyContext = (): MatchContext => ({ mode: null, map: null, point: null, side: null });

export const viewState = {
  compData: null as CompData | null,
  context: emptyContext(),
  mapFit: {} as Record<string, number>,
  enemyMapFit: {} as Record<string, number>,
};

export function onViewChange(listener: Listener): void {
  listeners.add(listener);
}

export function notifyViewChange(): void {
  listeners.forEach((listener) => listener());
}

export function contextPopulated(context: MatchContext): boolean {
  return Boolean(context.mode || context.map || context.point || context.side);
}

export function loadContext(): MatchContext {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(CONTEXT_KEY) ?? 'null');
    if (saved && typeof saved === 'object') return { ...emptyContext(), ...(saved as Partial<MatchContext>) };
  } catch {
    // Fall through to an empty context when saved data is unreadable.
  }
  return emptyContext();
}

export function saveContext(context: MatchContext): void {
  localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
}
