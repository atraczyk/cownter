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
        <div class="role-icon role-${role}" title="${label}"></div>
        <div class="hero-icon"></div>
        <select class="hero-select" data-team="${team}" data-slot="${slot}" data-role="${role}" aria-label="${teamLabel} ${label}">
          <option value="">${label}</option>
        </select>
        <div class="fit-chip"></div>
        <div class="score-section">
          <div class="${scoreClass}"></div>
          <div class="countered-heroes"></div>
          <div class="synergizing-heroes"></div>
        </div>
      </div>`).join('');
  });
}
