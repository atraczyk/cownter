/**
 * Main application module for OW2 Counter Picker
 * Initializes the application
 */

// Make clearTeam function available globally for onclick handlers
function clearTeam(team) {
    TeamManager.clearTeam(team);
}

// Initialize the application when the DOM is loaded
window.addEventListener('load', () => {
    // Initialize hero selector
    HeroSelector.init();

    // Load saved teams
    const savedTeams = TeamManager.loadTeams();

    // First fetch heroes data
    API.getHeroesWithRoles()
        .then(heroData => {
            // Populate hero selector grid
            HeroSelector.populateHeroSelector(heroData);

            // First populate dropdowns
            TeamManager.updateDropdowns(heroData);

            // Then restore saved selections
            TeamManager.restoreTeamSelections(savedTeams);

            // Position selector based on current mouse position
            HeroSelector.updateSelectorPosition();

            // Initialize team selection handlers
            TeamManager.initSelectionHandlers();

            // Update server state and get initial scores
            return API.restoreTeams(savedTeams);
        })
        .then(data => {
            // Update team scores immediately
            if (data.current_scores || data.enemy_scores) {
                ScoreManager.updateTeamScores({
                    current_scores: data.current_scores,
                    enemy_scores: data.enemy_scores
                });
            }

            // Check if enemy team is complete and request suggestions
            if (data.teams.enemy.some(hero => hero !== null)) {
                const firstEnemyHero = data.teams.enemy.find(hero => hero !== null);
                if (firstEnemyHero) {
                    return API.requestSuggestions(firstEnemyHero);
                }
            }
        })
        .then(data => {
            if (data && data.suggestions) {
                SuggestionManager.updateCounterSuggestions(data.suggestions);
            }
        })
        .catch(error => {
            console.error('Error initializing application:', error);
        });
});