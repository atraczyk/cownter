/**
 * API module for OW2 Counter Picker
 * Handles all server communication
 */

const API = {
    /**
     * Handle API response
     * @param {Response} response - The fetch response
     * @returns {Promise} - Promise resolving to the JSON data
     */
    handleResponse: function(response) {
        if (!response.ok) {
            return response.json().then(data => {
                console.error('Server error:', data);
                throw new Error(data.error || `Server error: ${response.status}`);
            });
        }
        return response.json();
    },

    /**
     * Handle API error
     * @param {Error} error - The error object
     * @throws {Error} - Rethrows the error
     */
    handleError: function(error) {
        console.error('API error:', error);
        throw error;
    },

    /**
     * Update a team with a hero selection
     * @param {string} team - The team name ('enemy' or 'counter')
     * @param {number} slot - The slot index
     * @param {string} hero - The hero name
     * @returns {Promise} - Promise resolving to the API response
     */
    updateTeam: function(team, slot, hero) {
        return fetch('/api/update_team', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                team: team,
                slot: slot,
                hero: hero
            })
        })
        .then(this.handleResponse)
        .catch(this.handleError);
    },

    /**
     * Get current scores for both teams
     * @returns {Promise} - Promise resolving to the scores data
     */
    getCurrentScores: function() {
        return fetch('/api/current_scores')
            .then(this.handleResponse)
            .catch(this.handleError);
    },

    /**
     * Clear a team's selections
     * @param {string} team - The team name ('enemy' or 'counter')
     * @returns {Promise} - Promise resolving to the API response
     */
    clearTeam: function(team) {
        return fetch('/api/clear_team', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ team })
        })
        .then(this.handleResponse)
        .catch(this.handleError);
    },

    /**
     * Restore teams from saved state
     * @param {Object} teams - The teams object
     * @returns {Promise} - Promise resolving to the API response
     */
    restoreTeams: function(teams) {
        return fetch('/api/restore_teams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(teams)
        })
        .then(this.handleResponse)
        .catch(this.handleError);
    },

    /**
     * Get heroes with their roles
     * @returns {Promise} - Promise resolving to the heroes data
     */
    getHeroesWithRoles: function() {
        return fetch('/api/heroes_with_roles')
            .then(this.handleResponse)
            .catch(this.handleError);
    },

    /**
     * Request counter suggestions for the enemy team
     * @param {string} enemyHero - An enemy hero to trigger the suggestion request
     * @returns {Promise} - Promise resolving to the suggestions data
     */
    requestSuggestions: function(enemyHero) {
        return this.updateTeam('enemy', 0, enemyHero);
    }
};