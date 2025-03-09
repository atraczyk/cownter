/**
 * Suggestion Manager module for OW2 Counter Picker
 * Handles counter suggestions
 */

const SuggestionManager = {
    /**
     * Update counter suggestions in the UI
     * @param {Object} suggestions - The suggestions object
     */
    updateCounterSuggestions: function(suggestions) {
        console.log('Received suggestions:', suggestions);  // Debug log
        if (!suggestions) return;

        // Check if suggestions object is empty or has no heroes
        const hasHeroes = Object.values(suggestions).some(heroes =>
            Array.isArray(heroes) && heroes.length > 0
        );

        if (!hasHeroes) {
            console.log('No hero suggestions available');
            return;
        }

        // Log all suggestion scores for comparison
        Object.entries(suggestions).forEach(([role, heroes]) => {
            if (Array.isArray(heroes)) {
                heroes.forEach(([hero, score, countered]) => {
                    console.log(`Suggestion block - ${hero}: score=${score}, counters=${countered}`);
                });
            }
        });

        const rightColumn = document.querySelector('.right-column');
        rightColumn.innerHTML = '';
        const suggestionBlock = this.createSuggestionBlock(suggestions);
        rightColumn.appendChild(suggestionBlock);
    },

    /**
     * Create a suggestion block element
     * @param {Object} suggestions - The suggestions object
     * @returns {HTMLElement} - The suggestion block element
     */
    createSuggestionBlock: function(suggestions) {
        console.log('Creating suggestion block with:', suggestions);  // Debug log

        const block = document.createElement('div');
        block.className = 'scoreboard';

        const content = document.createElement('div');
        content.className = 'suggestion-block';

        // Add header container
        const headerContainer = document.createElement('div');
        headerContainer.className = 'team-header-container';

        const header = document.createElement('div');
        header.className = 'team-header';
        header.textContent = 'SUGGESTED PICKS';

        headerContainer.appendChild(header);
        content.appendChild(headerContainer);

        // Track how many slots we've filled for each role
        const slotCounts = { tank: 0, damage: 0, support: 0 };
        const maxSlots = { tank: 1, damage: 2, support: 2 };

        // Add player rows for each role
        ['tank', 'damage', 'support'].forEach(role => {
            if (suggestions[role] && Array.isArray(suggestions[role]) && suggestions[role].length > 0) {
                suggestions[role].forEach((heroData) => {
                    console.log(`Processing hero data for ${role}:`, heroData);  // Debug log
                    const [hero, counterScore, counteredHeroes, synergizingHeroes] = heroData;
                    console.log(`Extracted data - hero: ${hero}, counter: ${counterScore}, countered: `, counteredHeroes, 'synergizes:', synergizingHeroes);  // Debug log

                    const row = document.createElement('div');
                    row.className = 'player-row';

                    const counteredHeroesHTML = (counteredHeroes || [])
                        .map(hero => `<div class="countered-hero-icon" style="background-image: url('${getHeroIcon(hero)}')"></div>`)
                        .join('');

                    const synergizingHeroesHTML = (synergizingHeroes || [])
                        .map(hero => `<div class="synergizing-hero-icon" style="background-image: url('${getHeroIcon(hero)}')"></div>`)
                        .join('');

                    // Calculate total score (need to add synergy bonuses)
                    const synergyBonus = (synergizingHeroes || []).length * 0.5;
                    const totalScore = counterScore + synergyBonus;

                    row.innerHTML = `
                        <div class="role-icon role-${role}"></div>
                        <div class="hero-icon" style="background-image: url('${getHeroIcon(hero)}')"></div>
                        <div style="font-weight: bold;">${hero}</div>
                        <div class="score-section">
                            <div class="score">${totalScore}</div>
                            <div class="countered-heroes">${counteredHeroesHTML}</div>
                            <div class="synergizing-heroes">${synergizingHeroesHTML}</div>
                        </div>
                    `;
                    content.appendChild(row);
                    slotCounts[role]++;
                });
            }

            // Add empty slots to match team block layout
            while (slotCounts[role] < maxSlots[role]) {
                const emptySlot = document.createElement('div');
                emptySlot.className = 'empty-slot';
                content.appendChild(emptySlot);
                slotCounts[role]++;
            }
        });

        // Calculate total score (need to add synergy bonuses)
        const totalScore = ['tank', 'damage', 'support'].reduce((total, role) => {
            if (!suggestions[role] || !Array.isArray(suggestions[role])) return total;
            return total + suggestions[role].reduce((roleTotal, [hero, counterScore, _countered, synergizingHeroes]) => {
                // Add counter score and synergy bonus (0.5 per synergy)
                const synergyBonus = (synergizingHeroes || []).length * 0.5;
                return roleTotal + counterScore + synergyBonus;
            }, 0);
        }, 0);

        const score = document.createElement('div');
        score.className = 'total-score-display';
        score.setAttribute('data-score', totalScore);
        content.appendChild(score);

        block.appendChild(content);
        return block;
    }
};