"""Web server for Overwatch 2 counter picker."""

from flask import Flask, render_template, jsonify, request, send_from_directory
from counter_analyzer import HeroDataProvider, TeamValidator, CounterAnalyzer

app = Flask(__name__)

# Initialize our classes
data_provider = HeroDataProvider()
team_validator = TeamValidator(data_provider)
counter_analyzer = CounterAnalyzer(data_provider)

# Ensure data is loaded
data_provider.load_data()

# Team state storage
teams = {
    'enemy': [None] * 5,
    'counter': [None] * 5
}

@app.route('/resources/<path:filename>')
def serve_resource(filename):
    """Serve resource files."""
    return send_from_directory('resources', filename)

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/api/heroes')
def get_heroes():
    """Get list of all heroes."""
    return jsonify(data_provider.get_hero_list())

@app.route('/api/match/<hero>')
def match_hero(hero):
    """Find closest match for hero name."""
    match = team_validator.match_hero_names([hero])[0]
    return jsonify({'match': match})

def is_duplicate_hero(hero, team_heroes, current_slot):
    """Check if hero is already selected in another slot."""
    return hero in [h for i, h in enumerate(team_heroes) if i != current_slot and h is not None]

@app.route('/api/update_team', methods=['POST'])
def update_team():
    """Update team composition and get counter suggestions."""
    data = request.json
    team = data['team']
    slot = int(data['slot'])
    hero = data['hero'] if data['hero'] else None

    # Check for duplicate hero
    if hero and is_duplicate_hero(hero, teams[team], slot):
        return jsonify({
            'error': 'This hero is already selected!',
            'teams': teams
        })

    teams[team][slot] = hero

    # Calculate scores and suggestions
    current_scores = None
    enemy_scores = None
    suggestions = None
    team_stats = None
    enemy_stats = None

    if any(teams['enemy']):
        enemy_heroes = [h for h in teams['enemy'] if h]

        # Convert counter team to dictionary format for compute_team_stats
        current_team = {}
        for i, hero in enumerate(teams['counter']):
            if hero:
                if i == 0:
                    slot_name = "tank_1"
                elif i == 1 or i == 2:
                    slot_name = f"damage_{i}"
                else:
                    slot_name = f"support_{i-2}"
                current_team[slot_name] = hero

        # Calculate team stats using new methods
        team_stats = counter_analyzer.compute_team_stats(current_team, enemy_heroes)
        enemy_stats = counter_analyzer.compute_enemy_stats(current_team, enemy_heroes)

        # For backward compatibility, also calculate the old scores
        current_heroes = [h for h in teams['counter'] if h]

        # Calculate current team scores (old method)
        if current_heroes:
            all_counters = counter_analyzer.suggest_counters(enemy_heroes)
            hero_scores = []
            total_score = 0
            for hero in current_heroes:
                score = 0
                countered = []
                for enemy_hero in enemy_heroes:
                    counter_score = counter_analyzer.get_counter_score(hero, enemy_hero)
                    if counter_score > 0:
                        score += counter_score
                        countered.append(enemy_hero)
                hero_scores.append((hero, score, sorted(countered, key=lambda h: counter_analyzer.get_counter_score(hero, h), reverse=True)))
                total_score += score

            current_scores = {
                'total_score': total_score,
                'heroes': hero_scores
            }

        # Calculate enemy team scores (old method)
        if enemy_heroes:
            all_counters = counter_analyzer.suggest_counters(current_heroes if current_heroes else [])
            hero_scores = []
            total_score = 0
            for hero in enemy_heroes:
                score = 0
                countered = []
                for current_hero in current_heroes:
                    counter_score = counter_analyzer.get_counter_score(hero, current_hero)
                    if counter_score > 0:
                        score += counter_score
                        countered.append(current_hero)
                hero_scores.append((hero, score, sorted(countered, key=lambda h: counter_analyzer.get_counter_score(hero, h), reverse=True)))
                total_score += score

            enemy_scores = {
                'total_score': total_score,
                'heroes': hero_scores
            }

        # Calculate suggestions if enemy team is complete
        if team == 'enemy' and all(h is not None for h in teams['enemy']):
            suggestions = counter_analyzer.suggest_counters(enemy_heroes)

    return jsonify({
        'teams': teams,
        'suggestions': suggestions,
        'current_scores': current_scores,
        'enemy_scores': enemy_scores,
        'team_stats': team_stats,
        'enemy_stats': enemy_stats
    })

@app.route('/api/heroes_with_roles')
def get_heroes_with_roles():
    """Get list of all heroes with their roles."""
    hero_data = data_provider.hero_data
    return jsonify({
        hero: {
            'role': hero_data[hero]['role']
        }
        for hero in hero_data.keys()
    })

@app.route('/api/clear_team', methods=['POST'])
def clear_team():
    """Clear specified team selections."""
    data = request.json
    team = data['team']
    teams[team] = [None] * 5

    # Calculate scores if applicable
    current_scores = None
    enemy_scores = None
    team_stats = None
    enemy_stats = None

    enemy_heroes = [h for h in teams['enemy'] if h]
    current_heroes = [h for h in teams['counter'] if h]

    if enemy_heroes and current_heroes:
        # Convert counter team to dictionary format for compute_team_stats
        current_team = {}
        for i, hero in enumerate(teams['counter']):
            if hero:
                if i == 0:
                    slot_name = "tank_1"
                elif i == 1 or i == 2:
                    slot_name = f"damage_{i}"
                else:
                    slot_name = f"support_{i-2}"
                current_team[slot_name] = hero

        # Calculate team stats using new methods
        team_stats = counter_analyzer.compute_team_stats(current_team, enemy_heroes)
        enemy_stats = counter_analyzer.compute_enemy_stats(current_team, enemy_heroes)

        # For backward compatibility, also calculate the old scores
        all_counters = counter_analyzer.suggest_counters(enemy_heroes)
        hero_scores = []
        total_score = 0
        for hero in current_heroes:
            score = 0
            for role_counters in all_counters.values():
                if not isinstance(role_counters, list):
                    continue
                for counter_hero, counter_score in role_counters:
                    if counter_hero == hero:
                        score = counter_score
                        break
            hero_scores.append((hero, score))
            total_score += score

        current_scores = {
            'total_score': total_score,
            'heroes': hero_scores
        }

    return jsonify({
        'teams': teams,
        'current_scores': current_scores,
        'enemy_scores': enemy_scores,
        'team_stats': team_stats,
        'enemy_stats': enemy_stats
    })

@app.route('/api/restore_teams', methods=['POST'])
def restore_teams():
    """Restore saved team state."""
    saved_teams = request.json
    teams['enemy'] = saved_teams['enemy']
    teams['counter'] = saved_teams['counter']

    # Calculate scores if applicable
    current_scores = None
    enemy_scores = None
    team_stats = None
    enemy_stats = None

    enemy_heroes = [h for h in teams['enemy'] if h]
    current_heroes = [h for h in teams['counter'] if h]

    if enemy_heroes and current_heroes:  # Need both teams to calculate scores
        # Convert counter team to dictionary format for compute_team_stats
        current_team = {}
        for i, hero in enumerate(teams['counter']):
            if hero:
                if i == 0:
                    slot_name = "tank_1"
                elif i == 1 or i == 2:
                    slot_name = f"damage_{i}"
                else:
                    slot_name = f"support_{i-2}"
                current_team[slot_name] = hero

        # Calculate team stats using new methods
        team_stats = counter_analyzer.compute_team_stats(current_team, enemy_heroes)
        enemy_stats = counter_analyzer.compute_enemy_stats(current_team, enemy_heroes)

        # For backward compatibility, also calculate the old scores
        # Calculate current team scores against enemy team
        if current_heroes:
            all_counters = counter_analyzer.suggest_counters(enemy_heroes)
            hero_scores = []
            total_score = 0
            for hero in current_heroes:
                score = 0
                countered = []
                for enemy_hero in enemy_heroes:
                    counter_score = counter_analyzer.get_counter_score(hero, enemy_hero)
                    if counter_score > 0:
                        score += counter_score
                        countered.append(enemy_hero)
                hero_scores.append((hero, score, sorted(countered, key=lambda h: counter_analyzer.get_counter_score(hero, h), reverse=True)))
                total_score += score

            current_scores = {
                'total_score': total_score,
                'heroes': hero_scores
            }

        # Calculate enemy team scores against current team
        if enemy_heroes:
            all_counters = counter_analyzer.suggest_counters(current_heroes if current_heroes else [])
            hero_scores = []
            total_score = 0
            for hero in enemy_heroes:
                score = 0
                countered = []
                for current_hero in current_heroes:
                    counter_score = counter_analyzer.get_counter_score(hero, current_hero)
                    if counter_score > 0:
                        score += counter_score
                        countered.append(current_hero)
                hero_scores.append((hero, score, sorted(countered, key=lambda h: counter_analyzer.get_counter_score(hero, h), reverse=True)))
                total_score += score

            enemy_scores = {
                'total_score': total_score,
                'heroes': hero_scores
            }

    return jsonify({
        'teams': teams,
        'current_scores': current_scores,
        'enemy_scores': enemy_scores,
        'team_stats': team_stats,
        'enemy_stats': enemy_stats
    })

@app.route('/api/current_scores', methods=['GET'])
def get_current_scores():
    """Get counter scores for current team composition."""
    current_scores = None
    enemy_scores = None
    team_stats = None
    enemy_stats = None

    enemy_heroes = [h for h in teams['enemy'] if h]
    current_heroes = [h for h in teams['counter'] if h]

    if enemy_heroes and current_heroes:  # Need both teams to calculate scores
        # Convert counter team to dictionary format for compute_team_stats
        current_team = {}
        for i, hero in enumerate(teams['counter']):
            if hero:
                if i == 0:
                    slot_name = "tank_1"
                elif i == 1 or i == 2:
                    slot_name = f"damage_{i}"
                else:
                    slot_name = f"support_{i-2}"
                current_team[slot_name] = hero

        # Calculate team stats using new methods
        team_stats = counter_analyzer.compute_team_stats(current_team, enemy_heroes)
        enemy_stats = counter_analyzer.compute_enemy_stats(current_team, enemy_heroes)

        # For backward compatibility, also calculate the old scores
        # Calculate current team scores against enemy team
        if current_heroes:
            all_counters = counter_analyzer.suggest_counters(enemy_heroes)
            hero_scores = []
            total_score = 0
            for hero in current_heroes:
                score = 0
                countered = []
                for enemy_hero in enemy_heroes:
                    counter_score = counter_analyzer.get_counter_score(hero, enemy_hero)
                    if counter_score > 0:
                        score += counter_score
                        countered.append(enemy_hero)
                hero_scores.append((hero, score, sorted(countered, key=lambda h: counter_analyzer.get_counter_score(hero, h), reverse=True)))
                total_score += score

            current_scores = {
                'total_score': total_score,
                'heroes': hero_scores
            }

        # Calculate enemy team scores against current team
        if enemy_heroes:
            all_counters = counter_analyzer.suggest_counters(current_heroes if current_heroes else [])
            hero_scores = []
            total_score = 0
            for hero in enemy_heroes:
                score = 0
                countered = []
                for current_hero in current_heroes:
                    counter_score = counter_analyzer.get_counter_score(hero, current_hero)
                    if counter_score > 0:
                        score += counter_score
                        countered.append(current_hero)
                hero_scores.append((hero, score, sorted(countered, key=lambda h: counter_analyzer.get_counter_score(hero, h), reverse=True)))
                total_score += score

            enemy_scores = {
                'total_score': total_score,
                'heroes': hero_scores
            }

    return jsonify({
        'current_scores': current_scores,
        'enemy_scores': enemy_scores,
        'team_stats': team_stats,
        'enemy_stats': enemy_stats
    })

def start(port: int = 5000, debug: bool = False):
    """Start the Flask server."""
    app.run(port=port, debug=debug)
