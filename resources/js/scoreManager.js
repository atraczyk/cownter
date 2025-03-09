/**
 * Score Manager module for OW2 Counter Picker
 * Handles score-related operations
 */

const ScoreManager = {
    /**
     * Update team scores in the UI
     * @param {Object} scores - The scores object
     */
    updateTeamScores: function(scores) {
        console.log('updateTeamScores called with:', scores);

        // Log all current team scores for comparison
        if (scores.current_scores) {
            console.log('Current team scores:');
            scores.current_scores.heroes.forEach(([hero, score, counteredHeroes, synergizingHeroes]) => {
                console.log(`Current block - ${hero}: score=${score}, counters=${counteredHeroes}, synergizes=${synergizingHeroes}`);
            });
        }

        // Only clear scores and countered heroes for teams that are being updated
        if (scores.current_scores) {
            document.querySelectorAll('.hero-select[data-team="counter"]').forEach(select => {
                const row = select.closest('.player-row');
                row.querySelector('.current-score').textContent = '';
                row.querySelector('.countered-heroes').innerHTML = '';
                row.querySelector('.synergizing-heroes').innerHTML = '';
            });
            document.querySelector('.team.blue-team .total-score-display').textContent = '';
        }

        if (scores.enemy_scores) {
            document.querySelectorAll('.hero-select[data-team="enemy"]').forEach(select => {
                const row = select.closest('.player-row');
                row.querySelector('.enemy-score').textContent = '';
                row.querySelector('.countered-heroes').innerHTML = '';
                row.querySelector('.synergizing-heroes').innerHTML = '';
            });
            document.querySelector('.team.red-team .total-score-display').textContent = '';
        }

        if (!scores) return;

        // Update current team scores
        if (scores.current_scores) {
            console.log('Updating current scores:', scores.current_scores);
            scores.current_scores.heroes.forEach(([hero, score, counteredHeroes, synergizingHeroes]) => {
                console.log(`Looking for current hero ${hero} with score ${score}`);
                // Get all selects and find the one with matching hero name (case-insensitive)
                const selects = document.querySelectorAll('.hero-select[data-team="counter"]');
                const select = Array.from(selects).find(s => s.value.toLowerCase() === hero.toLowerCase());
                console.log('Found current select:', select);
                if (select) {
                    const row = select.closest('.player-row');
                    const scoreDiv = row.querySelector('.current-score');
                    const counteredDiv = row.querySelector('.countered-heroes');
                    const synergizingDiv = row.querySelector('.synergizing-heroes');
                    console.log('Found current score div:', scoreDiv);
                    if (scoreDiv) {
                        scoreDiv.textContent = score;
                    }
                    if (counteredDiv && counteredHeroes) {
                        counteredDiv.innerHTML = counteredHeroes
                            .map(hero => `<div class="countered-hero-icon" style="background-image: url('${getHeroIcon(hero)}')"></div>`)
                            .join('');
                    }
                    if (synergizingDiv && synergizingHeroes) {
                        synergizingDiv.innerHTML = synergizingHeroes
                            .map(hero => `<div class="synergizing-hero-icon" style="background-image: url('${getHeroIcon(hero)}')"></div>`)
                            .join('');
                    }
                }
            });

            // Update current team total score
            const currentTotalDiv = document.querySelector('.team.blue-team .total-score-display');
            if (currentTotalDiv) {
                currentTotalDiv.setAttribute('data-score', scores.current_scores.total_score);
            }
        }

        // Update enemy team scores
        if (scores.enemy_scores) {
            console.log('Updating enemy scores:', scores.enemy_scores);
            scores.enemy_scores.heroes.forEach(([hero, score, counteredHeroes, synergizingHeroes]) => {
                console.log(`Looking for enemy hero ${hero} with score ${score}`);
                // Get all selects and find the one with matching hero name (case-insensitive)
                const selects = document.querySelectorAll('.hero-select[data-team="enemy"]');
                const select = Array.from(selects).find(s => s.value.toLowerCase() === hero.toLowerCase());
                console.log('Found enemy select:', select);
                if (select) {
                    const row = select.closest('.player-row');
                    const scoreDiv = row.querySelector('.enemy-score');
                    const counteredDiv = row.querySelector('.countered-heroes');
                    const synergizingDiv = row.querySelector('.synergizing-heroes');
                    console.log('Found enemy score div:', scoreDiv);
                    if (scoreDiv) {
                        scoreDiv.textContent = score;
                    }
                    if (counteredDiv && counteredHeroes) {
                        counteredDiv.innerHTML = counteredHeroes
                            .map(hero => `<div class="countered-hero-icon" style="background-image: url('${getHeroIcon(hero)}')"></div>`)
                            .join('');
                    }
                    if (synergizingDiv && synergizingHeroes) {
                        synergizingDiv.innerHTML = synergizingHeroes
                            .map(hero => `<div class="synergizing-hero-icon" style="background-image: url('${getHeroIcon(hero)}')"></div>`)
                            .join('');
                    }
                }
            });

            // Update enemy team total score
            const enemyTotalDiv = document.querySelector('.team.red-team .total-score-display');
            if (enemyTotalDiv) {
                enemyTotalDiv.setAttribute('data-score', scores.enemy_scores.total_score);
            }
        }
    }
};