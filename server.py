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

@app.route('/api/update_team', methods=['POST'])
def update_team():
    """Update team composition and get counter suggestions."""
    data = request.json
    team = data['team']
    slot = int(data['slot'])
    hero = data['hero'] if data['hero'] else None

    teams[team][slot] = hero

    # If updating enemy team, calculate counter suggestions
    suggestions = None
    if team == 'enemy' and any(teams['enemy']):
        enemy_heroes = [h for h in teams['enemy'] if h]
        if enemy_heroes:
            suggestions = suggest_counter_team(counter_data, enemy_heroes)

    return jsonify({
        'teams': teams,
        'suggestions': suggestions
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

def start_server(port: int = 5000, debug: bool = False):
    """Start the Flask server."""
    app.run(port=port, debug=debug)