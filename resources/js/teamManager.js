/**
 * Team Manager module for OW2 Counter Picker
 * Handles team-related operations
 */

const TeamManager = {
    /**
     * Save teams to local storage
     * @param {Object} teams - The teams object
     */
    saveTeams: function(teams) {
        localStorage.setItem('ow2_teams', JSON.stringify(teams));
    },

    /**
     * Load teams from local storage
     * @returns {Object} - The teams object
     */
    loadTeams: function() {
        const saved = localStorage.getItem('ow2_teams');
        return saved ? JSON.parse(saved) : {
            enemy: [null, null, null, null, null],
            counter: [null, null, null, null, null]
        };
    },

    /**
     * Clear a team's selections
     * @param {string} team - The team name ('enemy' or 'counter')
     */
    clearTeam: function(team) {
        if (!confirm(`Clear ${team === 'enemy' ? 'enemy' : 'current'} team selections?`)) return;

        // Clear selections and icons for this team
        document.querySelectorAll(`.hero-select[data-team="${team}"]`).forEach(select => {
            select.value = '';
            updateHeroIcon(select);
        });

        // Clear suggestion block if clearing enemy team
        if (team === 'enemy') {
            const rightColumn = document.querySelector('.right-column');
            rightColumn.innerHTML = '';
        }

        // Clear server state for this team
        API.clearTeam(team)
            .then(data => {
                // Save updated teams
                this.saveTeams(data.teams);

                // Update scores
                ScoreManager.updateTeamScores({
                    current_scores: data.current_scores,
                    enemy_scores: data.enemy_scores
                });

                // If enemy team was cleared, make sure suggestions are cleared
                if (team === 'enemy') {
                    const rightColumn = document.querySelector('.right-column');
                    rightColumn.innerHTML = '';
                }
            });
    },

    /**
     * Update dropdowns with available heroes
     * @param {Object} heroData - The hero data object
     */
    updateDropdowns: function(heroData) {
        document.querySelectorAll('.hero-select').forEach(select => {
            const role = select.dataset.role;
            const team = select.dataset.team;
            const currentSlot = select.dataset.slot;
            const currentValue = select.value;

            // Get heroes that are already selected in this team for this role
            const selectedHeroes = Array.from(document.querySelectorAll(`.hero-select[data-team="${team}"][data-role="${role}"]`))
                .filter(otherSelect => otherSelect.dataset.slot !== currentSlot)
                .map(select => select.value)
                .filter(Boolean);

            // Filter heroes by role and remove those selected in other slots of same role
            const filteredHeroes = Object.entries(heroData)
                .filter(([hero, data]) => data.role === role && !selectedHeroes.includes(hero))
                .map(([hero, _]) => hero)
                .sort();

            // Clear existing options except the first one
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add filtered heroes to dropdown with icons
            filteredHeroes.forEach(hero => {
                const option = document.createElement('option');
                option.value = hero;
                option.innerHTML = `<div class="select-option">
                    <div class="hero-icon" style="background-image: url('${getHeroIcon(hero)}')"></div>
                    <span>${hero}</span>
                </div>`;
                select.appendChild(option);
            });

            // Restore current selection if it exists
            if (currentValue) {
                select.value = currentValue;
            }
        });
    },

    /**
     * Update a hero selection
     * @param {HTMLElement} select - The select element
     * @param {string} hero - The hero name
     */
    updateHeroSelect: function(select, hero) {
        select.value = hero || '';
        updateHeroIcon(select);

        const team = select.dataset.team;
        const slot = parseInt(select.dataset.slot);

        // Request updated scores and suggestions
        API.updateTeam(team, slot, hero)
            .then(data => {
                if (data.error) {
                    console.error('Error:', data.error);
                    alert(data.error);
                    select.value = '';
                    updateHeroIcon(select);
                    return;
                }

                // Save updated teams
                this.saveTeams(data.teams);

                // Update team scores immediately
                if (data.current_scores || data.enemy_scores) {
                    ScoreManager.updateTeamScores({
                        current_scores: data.current_scores,
                        enemy_scores: data.enemy_scores
                    });
                }

                // Handle suggestions based on team and hero selection
                if (team === 'enemy') {
                    if (!hero || hero === '') {
                        // If a hero was removed from enemy team, check if any enemy heroes remain
                        if (data.teams.enemy.some(h => h !== null)) {
                            // If there are still enemy heroes, request new suggestions
                            const firstEnemyHero = data.teams.enemy.find(h => h !== null);
                            if (firstEnemyHero) {
                                API.requestSuggestions(firstEnemyHero)
                                    .then(suggestionData => {
                                        if (suggestionData && suggestionData.suggestions) {
                                            SuggestionManager.updateCounterSuggestions(suggestionData.suggestions);
                                        }
                                    });
                            }
                        } else {
                            // If no enemy heroes remain, clear suggestions
                            const rightColumn = document.querySelector('.right-column');
                            rightColumn.innerHTML = '';
                        }
                    } else if (data.suggestions) {
                        // If we have suggestions from the response, update them
                        SuggestionManager.updateCounterSuggestions(data.suggestions);
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while updating the team.');
                select.value = '';
                updateHeroIcon(select);
            });
    },

    /**
     * Initialize team selection handlers
     */
    initSelectionHandlers: function() {
        const self = this;
        document.querySelectorAll('.hero-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const team = e.target.dataset.team;
                const slot = e.target.dataset.slot;
                const hero = e.target.value;

                // Update the hero icon
                updateHeroIcon(e.target);

                // Update server state
                API.updateTeam(team, slot, hero)
                    .then(data => {
                        if (data.error) {
                            console.error('Data error:', data.error);
                            alert(data.error);
                            e.target.value = '';
                            updateHeroIcon(e.target);
                            return;
                        }
                        console.log('Update successful:', data);
                        // Save the updated teams
                        self.saveTeams(data.teams);

                        // If this is an enemy team update, update suggestions
                        if (team === 'enemy') {
                            if (data.suggestions) {
                                SuggestionManager.updateCounterSuggestions(data.suggestions);
                            } else if (data.teams.enemy.some(h => h !== null)) {
                                // If we have at least one enemy hero but no suggestions, request them
                                const firstEnemyHero = data.teams.enemy.find(h => h !== null);
                                if (firstEnemyHero) {
                                    API.requestSuggestions(firstEnemyHero)
                                        .then(suggestionData => {
                                            if (suggestionData && suggestionData.suggestions) {
                                                SuggestionManager.updateCounterSuggestions(suggestionData.suggestions);
                                            }
                                        })
                                        .catch(error => {
                                            console.error('Error fetching suggestions:', error);
                                        });
                                }
                            }
                        }

                        // Get current scores
                        return API.getCurrentScores()
                            .then(data => {
                                console.log('Current scores response:', data);
                                ScoreManager.updateTeamScores({
                                    current_scores: data.current_scores,
                                    enemy_scores: data.enemy_scores
                                });
                            })
                            .catch(error => {
                                console.error('Error fetching scores:', error);
                                alert('Error updating scores: ' + error.message);
                            });
                    })
                    .catch(error => {
                        console.error('Error updating team:', error);
                        alert('Error updating team: ' + error.message);
                        e.target.value = '';
                        updateHeroIcon(e.target);
                    });
            });
        });
    },

    /**
     * Restore saved team selections
     * @param {Object} savedTeams - The saved teams object
     */
    restoreTeamSelections: function(savedTeams) {
        Object.entries(savedTeams).forEach(([team, heroes]) => {
            heroes.forEach((hero, slot) => {
                if (hero) {
                    const select = document.querySelector(
                        `.hero-select[data-team="${team}"][data-slot="${slot}"]`
                    );
                    if (select) {
                        select.value = hero;
                        updateHeroIcon(select);
                    }
                }
            });
        });
    }
};