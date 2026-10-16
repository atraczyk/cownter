import type { Role, TeamName } from './types';

const SLOTS: Array<{ role: Role; label: string }> = [
  { role: 'tank', label: 'Tank' },
  { role: 'damage', label: 'Damage 1' },
  { role: 'damage', label: 'Damage 2' },
  { role: 'support', label: 'Support 1' },
  { role: 'support', label: 'Support 2' },
];

/** Build the five role slots for each team board. */
export function renderTeamRows(): void {
  document.querySelectorAll<HTMLElement>('.team-rows[data-team]').forEach((container) => {
    const team = container.dataset.team as TeamName;
    const scoreClass = team === 'enemy' ? 'enemy-score' : 'current-score';
    const teamLabel = team === 'enemy' ? 'Enemy' : 'Your';

    container.innerHTML = SLOTS.map(({ role, label }, slot) => `
      <div class="player-row">
        <div class="role-icon role-${role}" data-tip='${JSON.stringify({ title: label })}'></div>
        <div class="hero-picker-field">
          <select class="hero-select" data-team="${team}" data-slot="${slot}" data-role="${role}" aria-label="${teamLabel} ${label}" aria-hidden="true" tabindex="-1">
            <option value="">${label}</option>
          </select>
          <button type="button" class="hero-picker" data-team="${team}" data-slot="${slot}" aria-label="${teamLabel} ${label}" aria-haspopup="listbox" aria-expanded="false" aria-controls="hero-picker-options">
            <img class="hero-icon" alt="" />
            <span class="hero-picker-label">${label}</span>
            <span class="hero-picker-caret" aria-hidden="true"></span>
          </button>
        </div>
        <div class="fit-chip"></div>
        <div class="score-section">
          <div class="countered-heroes"></div>
          <div class="synergizing-heroes"></div>
          <div class="${scoreClass}"></div>
        </div>
      </div>`).join('');
  });
}
