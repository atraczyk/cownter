"""Web server for Overwatch 2 counter picker."""

from flask import Flask, render_template, jsonify, request, send_from_directory
from counter import fetch_counter_data, get_closest_match, suggest_counter_team

app = Flask(__name__)
counter_data = fetch_counter_data()

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
    return jsonify(list(counter_data.keys()))

@app.route('/api/match/<hero>')
def match_hero(hero):
    """Find closest match for hero name."""
    match = get_closest_match(hero, counter_data.keys())
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

    # Calculate scores
    current_scores = None
    suggestions = None
    if any(teams['enemy']):  # If there are any enemy heroes
        enemy_heroes = [h for h in teams['enemy'] if h]
        # Calculate scores for current picks
        current_heroes = [h for h in teams['counter'] if h]
        if current_heroes:
            # Get all counter suggestions
            all_counters = suggest_counter_team(counter_data, enemy_heroes)
            # Calculate scores for current heroes
            hero_scores = []
            total_score = 0
            for hero in current_heroes:
                # Find this hero in the suggestions
                score = 0
                for role_counters in all_counters.values():
                    if not isinstance(role_counters, list):  # Skip total_score
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

        # Calculate counter suggestions if enemy team is complete
        if team == 'enemy' and all(h is not None for h in teams['enemy']):
            suggestions = suggest_counter_team(counter_data, enemy_heroes)

    return jsonify({
        'teams': teams,
        'suggestions': suggestions,
        'current_scores': current_scores
    })

@app.route('/api/heroes_with_roles')
def get_heroes_with_roles():
    """Get list of all heroes with their roles."""
    return jsonify({
        hero: {
            'role': counter_data[hero]['role']
        }
        for hero in counter_data.keys()
    })

@app.route('/api/clear_teams', methods=['POST'])
def clear_teams():
    """Clear all team selections."""
    teams['enemy'] = [None] * 5
    teams['counter'] = [None] * 5
    return jsonify({'teams': teams})

@app.route('/api/restore_teams', methods=['POST'])
def restore_teams():
    """Restore saved team state."""
    saved_teams = request.json
    teams['enemy'] = saved_teams['enemy']
    teams['counter'] = saved_teams['counter']

    # Calculate current scores if applicable
    current_scores = None
    suggestions = None
    if any(teams['enemy']):
        enemy_heroes = [h for h in teams['enemy'] if h]
        current_heroes = [h for h in teams['counter'] if h]
        if current_heroes:
            all_counters = suggest_counter_team(counter_data, enemy_heroes)
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
        'current_scores': current_scores
    })

def start_server(port: int = 5000, debug: bool = False):
    """Start the Flask server."""
    app.run(port=port, debug=debug)