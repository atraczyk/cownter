/**
 * Utility functions for the OW2 Counter Picker application
 */

/**
 * Get the URL for a hero's icon
 * @param {string} hero - The hero name
 * @returns {string} - The URL for the hero's icon
 */
function getHeroIcon(hero) {
    if (!hero) return '';
    return `/resources/icon-${hero.toLowerCase()}.png`;
}

/**
 * Update the hero icon in a player row
 * @param {HTMLElement} select - The select element
 */
function updateHeroIcon(select) {
    const hero = select.value;
    const row = select.closest('.player-row');
    const iconDiv = row.querySelector('.hero-icon');
    if (hero) {
        iconDiv.style.backgroundImage = `url('${getHeroIcon(hero)}')`;
    } else {
        iconDiv.style.backgroundImage = 'none';
    }
}

/**
 * Get a hero's role from the hero data
 * @param {string} hero - The hero name
 * @param {Object} heroData - The hero data object
 * @returns {string} - The hero's role
 */
function getHeroRole(hero, heroData) {
    return heroData[hero]?.role || 'unknown';
}

/**
 * Get currently selected heroes for a team
 * @param {string} team - The team name ('enemy' or 'counter')
 * @returns {Array<string>} - Array of selected hero names
 */
function getSelectedHeroes(team) {
    return Array.from(document.querySelectorAll(`.hero-select[data-team="${team}"]`))
        .map(select => select.value)
        .filter(Boolean);  // Remove empty values
}