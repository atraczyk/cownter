import { ARCHETYPE_LABELS, dominant } from './compFit';
import { viewState } from './viewState';
import { getHeroIcon } from './utils';
import { heroLabel } from './tooltip';

let popup: HTMLDialogElement | null = null;
let search: HTMLInputElement | null = null;
let options: HTMLDivElement | null = null;
let activeSelect: HTMLSelectElement | null = null;
let activeButton: HTMLButtonElement | null = null;
let visibleValues: string[] = [];
let activeIndex = -1;

function buttonFor(select: HTMLSelectElement): HTMLButtonElement | null {
  return select.closest('.hero-picker-field')?.querySelector<HTMLButtonElement>('.hero-picker') ?? null;
}

function sync(select: HTMLSelectElement): void {
  const button = buttonFor(select);
  if (!button) return;
  const label = button.querySelector<HTMLElement>('.hero-picker-label');
  const image = button.querySelector<HTMLImageElement>('.hero-icon');
  if (label) label.textContent = select.value ? heroLabel(select.value) : select.options[0]?.textContent ?? 'Choose hero';
  button.setAttribute('aria-label', `${select.getAttribute('aria-label')}: ${label?.textContent ?? 'Choose hero'}`);
  if (image) {
    if (select.value) image.src = getHeroIcon(select.value);
    else image.removeAttribute('src');
  }
}

function position(): void {
  if (!popup || !options || !activeButton) return;
  if (window.matchMedia('(max-width: 760px)').matches) {
    popup.style.width = '100%';
    popup.style.left = '0';
    popup.style.top = '0';
    options.style.maxHeight = 'none';
    return;
  }
  const rect = activeButton.getBoundingClientRect();
  const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 16);
  const below = window.innerHeight - rect.bottom - 8;
  const above = rect.top - 8;
  const openBelow = below >= 240 || below >= above;
  const space = Math.max(120, openBelow ? below : above);
  const height = Math.min(360, space);
  popup.style.width = `${width}px`;
  popup.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
  popup.style.top = `${openBelow ? rect.bottom + 4 : rect.top - height - 4}px`;
  options.style.maxHeight = `${height - 52}px`;
}

function activate(index: number): void {
  if (!search || !options || !visibleValues.length) return;
  const step = index < activeIndex ? -1 : 1;
  activeIndex = (index + visibleValues.length) % visibleValues.length;
  for (let checked = 0; checked < visibleValues.length; checked++) {
    if (options.querySelectorAll('[role="option"]')[activeIndex]?.getAttribute('aria-disabled') !== 'true') break;
    activeIndex = (activeIndex + step + visibleValues.length) % visibleValues.length;
  }
  options.querySelectorAll<HTMLElement>('[role="option"]').forEach((option, item) => {
    option.classList.toggle('is-active', item === activeIndex);
    if (item === activeIndex) {
      search!.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    }
  });
}

function renderOptions(): void {
  if (!activeSelect || !options || !search) return;
  const query = search.value.trim().toLowerCase();
  const available = [...activeSelect.options];
  document.querySelectorAll<HTMLSelectElement>(`.hero-select[data-team="${activeSelect.dataset.team}"][data-role="${activeSelect.dataset.role}"]`).forEach(select => {
    if (!select.value || available.some(option => option.value === select.value)) return;
    const entry = new Option(heroLabel(select.value), select.value);
    entry.disabled = true;
    available.push(entry);
  });
  const entries = available
    .filter(option => !query || (option.value ? heroLabel(option.value) : 'Clear hero').toLowerCase().includes(query))
    .sort((a, b) => !a.value ? 1 : !b.value ? -1 : heroLabel(a.value).localeCompare(heroLabel(b.value)));

  visibleValues = entries.map((option) => option.value);
  options.replaceChildren(...entries.map((entry, index) => {
    const option = document.createElement('div');
    option.id = `hero-picker-option-${index}`;
    option.className = 'hero-picker-option';
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(entry.value === activeSelect!.value));
    option.dataset.value = entry.value;
    option.setAttribute('aria-disabled', String(entry.disabled));
    option.setAttribute('aria-label', entry.value ? heroLabel(entry.value) : 'Clear hero');
    if (entry.value) {
      const image = document.createElement('img');
      image.src = getHeroIcon(entry.value);
      image.alt = '';
      option.append(image);
    } else {
      const empty = document.createElement('span');
      empty.className = 'hero-picker-empty-icon';
      empty.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      empty.setAttribute('aria-hidden', 'true');
      option.append(empty);
    }
    const name = document.createElement('span');
    name.textContent = entry.value ? heroLabel(entry.value) : 'Clear hero';
    if (entry.disabled) name.append(' (already selected)');
    option.append(name);
    const weights = viewState.compData?.archetypes.heroes[entry.value];
    if (weights) {
      const archetype = dominant(weights);
      const hint = document.createElement('span');
      hint.className = `hero-picker-hint arch-${archetype}`;
      hint.textContent = ARCHETYPE_LABELS[archetype];
      option.append(hint);
    }
    return option;
  }));
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'hero-picker-no-results';
    empty.textContent = 'No heroes match';
    options.append(empty);
    activeIndex = -1;
    search.removeAttribute('aria-activedescendant');
  } else {
    const selected = activeSelect.value ? entries.findIndex((entry) => entry.value === activeSelect!.value) : -1;
    activate(selected >= 0 && !query ? selected : 0);
  }
}

function close(restoreFocus = false): void {
  if (!popup || !activeButton) return;
  const button = activeButton;
  popup.close();
  popup.hidden = true;
  button.setAttribute('aria-expanded', 'false');
  activeSelect = null;
  activeButton = null;
  if (restoreFocus) button.focus();
}

function choose(value: string): void {
  const select = activeSelect;
  if (!select) return;
  close(true);
  if (select.value === value) return;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function open(select: HTMLSelectElement, button: HTMLButtonElement, initialQuery = ''): void {
  if (!popup || !search) return;
  if (activeButton) close();
  activeSelect = select;
  activeButton = button;
  button.setAttribute('aria-expanded', 'true');
  popup.hidden = false;
  search.value = initialQuery;
  renderOptions();
  position();
  if (window.matchMedia('(max-width: 760px)').matches) {
    popup.showModal();
    popup.querySelector<HTMLButtonElement>('.hero-picker-close')?.focus();
  } else {
    popup.show();
    search.focus();
  }
}

export const HeroPicker = {
  init(): void {
    popup = document.createElement('dialog');
    popup.setAttribute('aria-label', 'Choose hero');
    popup.className = 'hero-picker-popup';
    popup.hidden = true;
    popup.innerHTML = '<button type="button" class="hero-picker-close" autofocus>Close</button><input placeholder="Search heroes" type="search" aria-label="Search heroes" aria-controls="hero-picker-options" autocomplete="off" spellcheck="false"><div id="hero-picker-options" role="listbox" aria-label="Available heroes"></div>';
    document.body.append(popup);
    popup.querySelector('.hero-picker-close')?.addEventListener('click', () => close(true));
    popup.addEventListener('cancel', event => { event.preventDefault(); close(true); });
    search = popup.querySelector('input');
    options = popup.querySelector('#hero-picker-options');

    document.querySelectorAll<HTMLSelectElement>('.hero-select').forEach((select) => {
      const button = buttonFor(select);
      if (!button) return;
      button.addEventListener('click', () => {
        if (activeButton === button) close(true);
        else open(select, button);
      });
      button.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          open(select, button);
        } else if (event.key.length === 1 && /[a-z0-9]/i.test(event.key)) {
          event.preventDefault();
          open(select, button, event.key);
        }
      });
    });

    search?.addEventListener('input', renderOptions);
    search?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        activate(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        activate(event.key === 'Home' ? 0 : visibleValues.length - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (activeIndex >= 0) choose(visibleValues[activeIndex]);
      } else if (event.key === 'Tab' && !popup?.matches(':modal')) close();
    });
    options?.addEventListener('click', (event) => {
      const option = event.target instanceof Element ? event.target.closest<HTMLElement>('[role="option"]') : null;
      if (option && option.getAttribute('aria-disabled') !== 'true') choose(option.dataset.value ?? '');
    });
    document.addEventListener('pointerdown', (event) => {
      if (!activeButton || !(event.target instanceof Node)) return;
      if (!popup?.contains(event.target) && !activeButton.contains(event.target)) close();
    });
    window.addEventListener('scroll', () => close());
    window.addEventListener('resize', () => { if (activeButton) position(); });
    this.syncAll();
  },

  syncAll(): void {
    document.querySelectorAll<HTMLSelectElement>('.hero-select').forEach(sync);
    if (activeSelect) renderOptions();
  },
};
