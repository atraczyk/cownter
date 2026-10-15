/** One shared, animated tooltip bubble for any element with `data-tip`. */

export type TipRow = [label: string, value: string];

export interface Tip {
  title: string;
  rows?: TipRow[];
  note?: string;
}

const GAP = 10;
const EDGE = 8;

let bubble: HTMLDivElement | null = null;
let anchor: HTMLElement | null = null;

export function setTip(element: HTMLElement, tip: Tip | null): void {
  element.removeAttribute('title');
  if (tip) element.dataset.tip = JSON.stringify(tip);
  else delete element.dataset.tip;
}

export function heroLabel(hero: string): string {
  return hero.charAt(0).toUpperCase() + hero.slice(1);
}

function render(tip: Tip): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const title = document.createElement('div');
  title.className = 'tip-title';
  title.textContent = tip.title;
  fragment.append(title);

  if (tip.rows?.length) {
    const rows = document.createElement('dl');
    rows.className = 'tip-rows';
    for (const [label, value] of tip.rows) {
      const term = document.createElement('dt');
      term.textContent = label;
      const detail = document.createElement('dd');
      detail.textContent = value;
      rows.append(term, detail);
    }
    fragment.append(rows);
  }

  if (tip.note) {
    const note = document.createElement('div');
    note.className = 'tip-note';
    note.textContent = tip.note;
    fragment.append(note);
  }
  return fragment;
}

function place(target: HTMLElement, element: HTMLDivElement): void {
  const rect = target.getBoundingClientRect();
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const center = rect.left + rect.width / 2;
  const left = Math.min(Math.max(center - width / 2, EDGE), window.innerWidth - width - EDGE);
  const below = rect.top - height - GAP < EDGE;
  const top = below ? rect.bottom + GAP : rect.top - height - GAP;

  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.setProperty('--arrow-x', `${center - left}px`);
  element.classList.toggle('below', below);
}

function show(target: HTMLElement): void {
  const raw = target.dataset.tip;
  if (!raw || !bubble) return;
  anchor = target;
  bubble.replaceChildren(render(JSON.parse(raw) as Tip));
  bubble.classList.remove('visible');
  bubble.hidden = false;
  place(target, bubble);
  void bubble.offsetWidth;
  bubble.classList.add('visible');
  target.setAttribute('aria-describedby', bubble.id);
}

function hide(): void {
  if (!bubble) return;
  anchor?.removeAttribute('aria-describedby');
  anchor = null;
  bubble.classList.remove('visible');
  bubble.hidden = true;
}

function tipTarget(node: EventTarget | null): HTMLElement | null {
  return node instanceof Element ? node.closest<HTMLElement>('[data-tip]') : null;
}

export function initTooltips(): void {
  bubble = document.createElement('div');
  bubble.id = 'tooltip';
  bubble.className = 'tooltip';
  bubble.setAttribute('role', 'tooltip');
  bubble.hidden = true;
  document.body.append(bubble);

  document.addEventListener('pointerover', (event) => {
    const target = tipTarget(event.target);
    if (target && target !== anchor) show(target);
  });
  document.addEventListener('pointerout', (event) => {
    if (anchor && tipTarget(event.relatedTarget) !== anchor) hide();
  });
  document.addEventListener('focusin', (event) => {
    const target = tipTarget(event.target);
    if (target) show(target);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
  window.addEventListener('scroll', hide, { passive: true, capture: true });
}
