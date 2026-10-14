"""Web server for Overwatch 2 counter picker."""

from flask import Flask, render_template, jsonify, request, send_from_directory
import os

from src.core.counter_analyzer import HeroDataProvider, TeamValidator, CounterAnalyzer
from src.core.comp_fit import CompDataProvider, SIDES

# Create Flask app with correct template and static folder paths
template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../templates'))
app = Flask(__name__, template_folder=template_dir)

# Initialize our classes
data_provider = HeroDataProvider()
team_validator = TeamValidator(data_provider)
counter_analyzer = CounterAnalyzer(data_provider)

# Ensure data is loaded
data_provider.load_data()

comp_data = CompDataProvider()

# Team state storage
teams = {
    'enemy': [None] * 5,
    'counter': [None] * 5
}

# Selected map point; side is the side your team plays on sided modes
match_context = {'map': None, 'point': None, 'side': None}


def current_fit_bonus():
    """Map-fit bonus per hero for the selected map point, or {} when none is set."""
    preference = comp_data.point_preference(
        match_context['map'], match_context['point'], match_context['side'])
    return comp_data.fit_bonuses(preference)


def build_suggestions(enemy_heroes):
    """Counter suggestions for a full enemy team, weighted by the selected map point."""
    suggestions = counter_analyzer.suggest_counters(enemy_heroes, current_fit_bonus() or None)
    for role, heroes in suggestions.items():
        if not isinstance(heroes, list):
            continue
        for i, hero_data in enumerate(heroes):
            hero, score = hero_data[0], hero_data[1]
            countered = list(hero_data[2]) if len(hero_data) > 2 else []
            synergizes = list(hero_data[3]) if len(hero_data) > 3 else []

            if hero in counter_analyzer.data_provider.hero_data:
                hero_info = counter_analyzer.data_provider.hero_data[hero]
                if 'synergizes_with' in hero_info:
                    for other_role, other_heroes in suggestions.items():
                        if not isinstance(other_heroes, list) or other_role == role:
                            continue
                        for other_hero_data in other_heroes:
                            other_hero = other_hero_data[0]
                            if other_hero == hero:
                                continue
                            other_role_category = other_role + "s" if other_role != "damage" else other_role
                            if other_hero in hero_info['synergizes_with'].get(other_role_category, []):
                                synergizes.append(other_hero)
            suggestions[role][i] = (hero, score, countered, sorted(synergizes))
    return suggestions

@app.route('/resources/<path:filename>')
def serve_resource(filename):
    """Serve resource files."""
    resources_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../resources'))
    return send_from_directory(resources_dir, filename)

@app.route('/resources/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files."""
    css_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../resources/css'))
    return send_from_directory(css_dir, filename)

@app.route('/resources/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files."""
    js_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../resources/js'))
    return send_from_directory(js_dir, filename)

@app.route('/resources/images/roles/<path:filename>')
def serve_roles(filename):
    """Serve role icon files."""
    roles_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../resources/images/roles'))
    return send_from_directory(roles_dir, filename)

@app.route('/resources/images/icons/<path:filename>')
def serve_icons(filename):
    """Serve hero icon files."""
    icons_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../resources/images/icons'))
    return send_from_directory(icons_dir, filename)

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

def adopt_client_teams(client_teams):
    """Replace the stored teams with the page's own, so other tabs or a server restart can't desync it."""
    if not isinstance(client_teams, dict):
        return
    known = data_provider.hero_data
    for name in teams:
        slots = client_teams.get(name)
        if not isinstance(slots, list) or len(slots) != len(teams[name]):
            return
        if any(hero is not None and hero not in known for hero in slots):
            return
    for name in teams:
        teams[name] = list(client_teams[name])

def is_duplicate_hero(hero, team_heroes, current_slot):
    """Check if hero is already selected in another slot."""
    return hero in [h for i, h in enumerate(team_heroes) if i != current_slot and h is not None]

@app.route('/api/update_team', methods=['POST'])
def update_team():
    """Update team composition and get counter suggestions."""
    try:
        # Add request logging
        app.logger.info(f"Received update_team request with data: {request.json}")

        data = request.json
        if not data:
            app.logger.warning("No JSON data received in update_team request")
            return jsonify({
                'error': 'No JSON data received',
                'teams': teams
            }), 400

        team = data.get('team')
        if not team or team not in teams:
            app.logger.warning(f"Invalid team specified in update_team request: {team}")
            return jsonify({
                'error': 'Invalid team specified',
                'teams': teams
            }), 400

        try:
            slot = int(data.get('slot', -1))
            if slot < 0 or slot >= len(teams[team]):
                app.logger.warning(f"Invalid slot specified in update_team request: {slot}")
                return jsonify({
                    'error': 'Invalid slot specified',
                    'teams': teams
                }), 400
        except (ValueError, TypeError) as e:
            app.logger.warning(f"Invalid slot value in update_team request: {data.get('slot')}, error: {str(e)}")
            return jsonify({
                'error': 'Invalid slot value',
                'teams': teams
            }), 400

        hero = data.get('hero')
        app.logger.info(f"Processing update for team: {team}, slot: {slot}, hero: {hero}")
        adopt_client_teams(data.get('teams'))

        # Check for duplicate hero
        if hero and is_duplicate_hero(hero, teams[team], slot):
            app.logger.warning(f"Duplicate hero selection attempted: {hero}")
            return jsonify({
                'error': 'This hero is already selected!',
                'teams': teams
            })

        # Store previous state for logging
        previous_hero = teams[team][slot]
        teams[team][slot] = hero
        app.logger.info(f"Updated {team} team slot {slot} from {previous_hero} to {hero}")

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

            # Calculate current team scores against enemy team
            if current_heroes:
                # Calculate counter scores and track which enemies each hero counters
                counter_scores = {}
                countered_heroes = {}
                synergy_scores = {}
                synergizing_heroes = {}

                # First calculate counter scores
                for hero in current_heroes:
                    if hero not in counter_analyzer.data_provider.hero_data:
                        continue
                    hero_info = counter_analyzer.data_provider.hero_data[hero]
                    if 'strong_against' not in hero_info:
                        continue

                    score = 0
                    countered = []
                    for enemy in enemy_heroes:
                        if enemy not in counter_analyzer.data_provider.hero_data:
                            continue
                        enemy_role = counter_analyzer.data_provider.hero_data[enemy]['role']
                        role_category = enemy_role + "s" if enemy_role != "damage" else enemy_role

                        if role_category in hero_info['strong_against']:
                            if enemy in hero_info['strong_against'][role_category]:
                                score += 1
                                countered.append(enemy)

                    counter_scores[hero] = score
                    countered_heroes[hero] = countered

                # Then calculate synergy scores
                for i, hero1 in enumerate(current_heroes):
                    if hero1 not in counter_analyzer.data_provider.hero_data:
                        continue
                    hero1_info = counter_analyzer.data_provider.hero_data[hero1]
                    if 'synergizes_with' not in hero1_info:
                        continue

                    synergy_score = 0
                    synergizes = []
                    for hero2 in current_heroes[i+1:]:  # Only check heroes after this one to avoid double counting
                        if hero2 not in counter_analyzer.data_provider.hero_data:
                            continue
                        hero2_role = counter_analyzer.data_provider.hero_data[hero2]['role']
                        role_category = hero2_role + "s" if hero2_role != "damage" else hero2_role

                        if role_category in hero1_info['synergizes_with']:
                            if hero2 in hero1_info['synergizes_with'][role_category]:
                                synergy_score += 0.5
                                synergizes.append(hero2)
                                # Add the synergy score and hero to hero2's data as well
                                if hero2 not in synergy_scores:
                                    synergy_scores[hero2] = 0
                                    synergizing_heroes[hero2] = []
                                synergy_scores[hero2] += 0.5
                                synergizing_heroes[hero2].append(hero1)

                    if hero1 not in synergy_scores:
                        synergy_scores[hero1] = 0
                        synergizing_heroes[hero1] = []
                    synergy_scores[hero1] += synergy_score
                    synergizing_heroes[hero1].extend(synergizes)

                # Calculate scores for current team heroes
                hero_scores = []
                total_score = 0
                for hero in current_heroes:
                    counter_score = counter_scores.get(hero, 0)
                    synergy_score = synergy_scores.get(hero, 0)
                    total_hero_score = counter_score + synergy_score
                    countered = sorted(countered_heroes.get(hero, []))
                    synergizes = sorted(synergizing_heroes.get(hero, []))
                    hero_scores.append((hero, total_hero_score, countered, synergizes))
                    total_score += total_hero_score

                current_scores = {
                    'total_score': total_score,
                    'heroes': hero_scores
                }

            # Calculate enemy team scores against current team
            if enemy_heroes:
                # Calculate counter scores and track which enemies each hero counters
                counter_scores = {}
                countered_heroes = {}
                synergy_scores = {}
                synergizing_heroes = {}

                # First calculate counter scores
                for hero in enemy_heroes:
                    if hero not in counter_analyzer.data_provider.hero_data:
                        continue
                    hero_info = counter_analyzer.data_provider.hero_data[hero]
                    if 'strong_against' not in hero_info:
                        continue

                    score = 0
                    countered = []
                    for current_hero in current_heroes:
                        if current_hero not in counter_analyzer.data_provider.hero_data:
                            continue
                        current_role = counter_analyzer.data_provider.hero_data[current_hero]['role']
                        role_category = current_role + "s" if current_role != "damage" else current_role

                        if role_category in hero_info['strong_against']:
                            if current_hero in hero_info['strong_against'][role_category]:
                                score += 1
                                countered.append(current_hero)

                    counter_scores[hero] = score
                    countered_heroes[hero] = countered

                # Then calculate synergy scores
                for i, hero1 in enumerate(enemy_heroes):
                    if hero1 not in counter_analyzer.data_provider.hero_data:
                        continue
                    hero1_info = counter_analyzer.data_provider.hero_data[hero1]
                    if 'synergizes_with' not in hero1_info:
                        continue

                    synergy_score = 0
                    synergizes = []
                    for hero2 in enemy_heroes[i+1:]:  # Only check heroes after this one to avoid double counting
                        if hero2 not in counter_analyzer.data_provider.hero_data:
                            continue
                        hero2_role = counter_analyzer.data_provider.hero_data[hero2]['role']
                        role_category = hero2_role + "s" if hero2_role != "damage" else hero2_role

                        if role_category in hero1_info['synergizes_with']:
                            if hero2 in hero1_info['synergizes_with'][role_category]:
                                synergy_score += 0.5
                                synergizes.append(hero2)
                                # Add the synergy score and hero to hero2's data as well
                                if hero2 not in synergy_scores:
                                    synergy_scores[hero2] = 0
                                    synergizing_heroes[hero2] = []
                                synergy_scores[hero2] += 0.5
                                synergizing_heroes[hero2].append(hero1)

                    if hero1 not in synergy_scores:
                        synergy_scores[hero1] = 0
                        synergizing_heroes[hero1] = []
                    synergy_scores[hero1] += synergy_score
                    synergizing_heroes[hero1].extend(synergizes)

                # Calculate scores for enemy team heroes
                hero_scores = []
                total_score = 0
                for hero in enemy_heroes:
                    counter_score = counter_scores.get(hero, 0)
                    synergy_score = synergy_scores.get(hero, 0)
                    total_hero_score = counter_score + synergy_score
                    countered = sorted(countered_heroes.get(hero, []))
                    synergizes = sorted(synergizing_heroes.get(hero, []))
                    hero_scores.append((hero, total_hero_score, countered, synergizes))
                    total_score += total_hero_score

                enemy_scores = {
                    'total_score': total_score,
                    'heroes': hero_scores
                }

            # Calculate suggestions if enemy team is complete
            if team == 'enemy' and all(h is not None for h in teams['enemy']):
                suggestions = build_suggestions(enemy_heroes)

        return jsonify({
            'teams': teams,
            'suggestions': suggestions,
            'current_scores': current_scores,
            'enemy_scores': enemy_scores,
            'team_stats': team_stats,
            'enemy_stats': enemy_stats
        })
    except Exception as e:
        import traceback
        error_tb = traceback.format_exc()
        app.logger.error(f"Error in update_team: {str(e)}\nTraceback:\n{error_tb}")
        return jsonify({
            'error': f'Internal server error occurred: {str(e)}',
            'teams': teams
        }), 500

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
            # Calculate counter scores and track which enemies each hero counters
            counter_scores = {}
            countered_heroes = {}
            synergy_scores = {}
            synergizing_heroes = {}

            # First calculate counter scores
            for hero in current_heroes:
                if hero not in counter_analyzer.data_provider.hero_data:
                    continue
                hero_info = counter_analyzer.data_provider.hero_data[hero]
                if 'strong_against' not in hero_info:
                    continue

                score = 0
                countered = []
                for enemy in enemy_heroes:
                    if enemy not in counter_analyzer.data_provider.hero_data:
                        continue
                    enemy_role = counter_analyzer.data_provider.hero_data[enemy]['role']
                    role_category = enemy_role + "s" if enemy_role != "damage" else enemy_role

                    if role_category in hero_info['strong_against']:
                        if enemy in hero_info['strong_against'][role_category]:
                            score += 1
                            countered.append(enemy)

                counter_scores[hero] = score
                countered_heroes[hero] = countered

            # Then calculate synergy scores
            for i, hero1 in enumerate(current_heroes):
                if hero1 not in counter_analyzer.data_provider.hero_data:
                    continue
                hero1_info = counter_analyzer.data_provider.hero_data[hero1]
                if 'synergizes_with' not in hero1_info:
                    continue

                synergy_score = 0
                synergizes = []
                for hero2 in current_heroes[i+1:]:  # Only check heroes after this one to avoid double counting
                    if hero2 not in counter_analyzer.data_provider.hero_data:
                        continue
                    hero2_role = counter_analyzer.data_provider.hero_data[hero2]['role']
                    role_category = hero2_role + "s" if hero2_role != "damage" else hero2_role

                    if role_category in hero1_info['synergizes_with']:
                        if hero2 in hero1_info['synergizes_with'][role_category]:
                            synergy_score += 0.5
                            synergizes.append(hero2)
                            # Add the synergy score and hero to hero2's data as well
                            if hero2 not in synergy_scores:
                                synergy_scores[hero2] = 0
                                synergizing_heroes[hero2] = []
                            synergy_scores[hero2] += 0.5
                            synergizing_heroes[hero2].append(hero1)

                if hero1 not in synergy_scores:
                    synergy_scores[hero1] = 0
                    synergizing_heroes[hero1] = []
                synergy_scores[hero1] += synergy_score
                synergizing_heroes[hero1].extend(synergizes)

            # Calculate scores for current team heroes
            hero_scores = []
            total_score = 0
            for hero in current_heroes:
                counter_score = counter_scores.get(hero, 0)
                synergy_score = synergy_scores.get(hero, 0)
                total_hero_score = counter_score + synergy_score
                countered = sorted(countered_heroes.get(hero, []))
                synergizes = sorted(synergizing_heroes.get(hero, []))
                hero_scores.append((hero, total_hero_score, countered, synergizes))
                total_score += total_hero_score

            current_scores = {
                'total_score': total_score,
                'heroes': hero_scores
            }

        # Calculate enemy team scores against current team
        if enemy_heroes:
            # Calculate counter scores and track which enemies each hero counters
            counter_scores = {}
            countered_heroes = {}
            synergy_scores = {}
            synergizing_heroes = {}

            # First calculate counter scores
            for hero in enemy_heroes:
                if hero not in counter_analyzer.data_provider.hero_data:
                    continue
                hero_info = counter_analyzer.data_provider.hero_data[hero]
                if 'strong_against' not in hero_info:
                    continue

                score = 0
                countered = []
                for current_hero in current_heroes:
                    if current_hero not in counter_analyzer.data_provider.hero_data:
                        continue
                    current_role = counter_analyzer.data_provider.hero_data[current_hero]['role']
                    role_category = current_role + "s" if current_role != "damage" else current_role

                    if role_category in hero_info['strong_against']:
                        if current_hero in hero_info['strong_against'][role_category]:
                            score += 1
                            countered.append(current_hero)

                counter_scores[hero] = score
                countered_heroes[hero] = countered

            # Then calculate synergy scores
            for i, hero1 in enumerate(enemy_heroes):
                if hero1 not in counter_analyzer.data_provider.hero_data:
                    continue
                hero1_info = counter_analyzer.data_provider.hero_data[hero1]
                if 'synergizes_with' not in hero1_info:
                    continue

                synergy_score = 0
                synergizes = []
                for hero2 in enemy_heroes[i+1:]:  # Only check heroes after this one to avoid double counting
                    if hero2 not in counter_analyzer.data_provider.hero_data:
                        continue
                    hero2_role = counter_analyzer.data_provider.hero_data[hero2]['role']
                    role_category = hero2_role + "s" if hero2_role != "damage" else hero2_role

                    if role_category in hero1_info['synergizes_with']:
                        if hero2 in hero1_info['synergizes_with'][role_category]:
                            synergy_score += 0.5
                            synergizes.append(hero2)
                            # Add the synergy score and hero to hero2's data as well
                            if hero2 not in synergy_scores:
                                synergy_scores[hero2] = 0
                                synergizing_heroes[hero2] = []
                            synergy_scores[hero2] += 0.5
                            synergizing_heroes[hero2].append(hero1)

                if hero1 not in synergy_scores:
                    synergy_scores[hero1] = 0
                    synergizing_heroes[hero1] = []
                synergy_scores[hero1] += synergy_score
                synergizing_heroes[hero1].extend(synergizes)

            # Calculate scores for enemy team heroes
            hero_scores = []
            total_score = 0
            for hero in enemy_heroes:
                counter_score = counter_scores.get(hero, 0)
                synergy_score = synergy_scores.get(hero, 0)
                total_hero_score = counter_score + synergy_score
                countered = sorted(countered_heroes.get(hero, []))
                synergizes = sorted(synergizing_heroes.get(hero, []))
                hero_scores.append((hero, total_hero_score, countered, synergizes))
                total_score += total_hero_score

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
            # Calculate counter scores and track which enemies each hero counters
            counter_scores = {}
            countered_heroes = {}
            synergy_scores = {}
            synergizing_heroes = {}

            # First calculate counter scores
            for hero in current_heroes:
                if hero not in counter_analyzer.data_provider.hero_data:
                    continue
                hero_info = counter_analyzer.data_provider.hero_data[hero]
                if 'strong_against' not in hero_info:
                    continue

                score = 0
                countered = []
                for enemy in enemy_heroes:
                    if enemy not in counter_analyzer.data_provider.hero_data:
                        continue
                    enemy_role = counter_analyzer.data_provider.hero_data[enemy]['role']
                    role_category = enemy_role + "s" if enemy_role != "damage" else enemy_role

                    if role_category in hero_info['strong_against']:
                        if enemy in hero_info['strong_against'][role_category]:
                            score += 1
                            countered.append(enemy)

                counter_scores[hero] = score
                countered_heroes[hero] = countered

            # Then calculate synergy scores
            for i, hero1 in enumerate(current_heroes):
                if hero1 not in counter_analyzer.data_provider.hero_data:
                    continue
                hero1_info = counter_analyzer.data_provider.hero_data[hero1]
                if 'synergizes_with' not in hero1_info:
                    continue

                synergy_score = 0
                synergizes = []
                for hero2 in current_heroes[i+1:]:  # Only check heroes after this one to avoid double counting
                    if hero2 not in counter_analyzer.data_provider.hero_data:
                        continue
                    hero2_role = counter_analyzer.data_provider.hero_data[hero2]['role']
                    role_category = hero2_role + "s" if hero2_role != "damage" else hero2_role

                    if role_category in hero1_info['synergizes_with']:
                        if hero2 in hero1_info['synergizes_with'][role_category]:
                            synergy_score += 0.5
                            synergizes.append(hero2)
                            # Add the synergy score and hero to hero2's data as well
                            if hero2 not in synergy_scores:
                                synergy_scores[hero2] = 0
                                synergizing_heroes[hero2] = []
                            synergy_scores[hero2] += 0.5
                            synergizing_heroes[hero2].append(hero1)

                if hero1 not in synergy_scores:
                    synergy_scores[hero1] = 0
                    synergizing_heroes[hero1] = []
                synergy_scores[hero1] += synergy_score
                synergizing_heroes[hero1].extend(synergizes)

            # Calculate scores for current team heroes
            hero_scores = []
            total_score = 0
            for hero in current_heroes:
                counter_score = counter_scores.get(hero, 0)
                synergy_score = synergy_scores.get(hero, 0)
                total_hero_score = counter_score + synergy_score
                countered = sorted(countered_heroes.get(hero, []))
                synergizes = sorted(synergizing_heroes.get(hero, []))
                hero_scores.append((hero, total_hero_score, countered, synergizes))
                total_score += total_hero_score

            current_scores = {
                'total_score': total_score,
                'heroes': hero_scores
            }

        # Calculate enemy team scores against current team
        if enemy_heroes:
            # Calculate counter scores and track which enemies each hero counters
            counter_scores = {}
            countered_heroes = {}
            synergy_scores = {}
            synergizing_heroes = {}

            # First calculate counter scores
            for hero in enemy_heroes:
                if hero not in counter_analyzer.data_provider.hero_data:
                    continue
                hero_info = counter_analyzer.data_provider.hero_data[hero]
                if 'strong_against' not in hero_info:
                    continue

                score = 0
                countered = []
                for current_hero in current_heroes:
                    if current_hero not in counter_analyzer.data_provider.hero_data:
                        continue
                    current_role = counter_analyzer.data_provider.hero_data[current_hero]['role']
                    role_category = current_role + "s" if current_role != "damage" else current_role

                    if role_category in hero_info['strong_against']:
                        if current_hero in hero_info['strong_against'][role_category]:
                            score += 1
                            countered.append(current_hero)

                counter_scores[hero] = score
                countered_heroes[hero] = countered

            # Then calculate synergy scores
            for i, hero1 in enumerate(enemy_heroes):
                if hero1 not in counter_analyzer.data_provider.hero_data:
                    continue
                hero1_info = counter_analyzer.data_provider.hero_data[hero1]
                if 'synergizes_with' not in hero1_info:
                    continue

                synergy_score = 0
                synergizes = []
                for hero2 in enemy_heroes[i+1:]:  # Only check heroes after this one to avoid double counting
                    if hero2 not in counter_analyzer.data_provider.hero_data:
                        continue
                    hero2_role = counter_analyzer.data_provider.hero_data[hero2]['role']
                    role_category = hero2_role + "s" if hero2_role != "damage" else hero2_role

                    if role_category in hero1_info['synergizes_with']:
                        if hero2 in hero1_info['synergizes_with'][role_category]:
                            synergy_score += 0.5
                            synergizes.append(hero2)
                            # Add the synergy score and hero to hero2's data as well
                            if hero2 not in synergy_scores:
                                synergy_scores[hero2] = 0
                                synergizing_heroes[hero2] = []
                            synergy_scores[hero2] += 0.5
                            synergizing_heroes[hero2].append(hero1)

                if hero1 not in synergy_scores:
                    synergy_scores[hero1] = 0
                    synergizing_heroes[hero1] = []
                synergy_scores[hero1] += synergy_score
                synergizing_heroes[hero1].extend(synergizes)

            # Calculate scores for enemy team heroes
            hero_scores = []
            total_score = 0
            for hero in enemy_heroes:
                counter_score = counter_scores.get(hero, 0)
                synergy_score = synergy_scores.get(hero, 0)
                total_hero_score = counter_score + synergy_score
                countered = sorted(countered_heroes.get(hero, []))
                synergizes = sorted(synergizing_heroes.get(hero, []))
                hero_scores.append((hero, total_hero_score, countered, synergizes))
                total_score += total_hero_score

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

@app.route('/api/comp_data')
def get_comp_data():
    """Game modes, maps and hero comp leanings from the versioned data sheets."""
    return jsonify(comp_data.client_payload())

@app.route('/api/context', methods=['GET', 'POST'])
def set_context():
    """Read or set the selected map, point and side; returns refreshed suggestions."""
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        side = data.get('side')
        match_context.update({
            'map': data.get('map') or None,
            'point': data.get('point') or None,
            'side': side if side in SIDES else None,
        })
        adopt_client_teams(data.get('teams'))

    enemy_heroes = [h for h in teams['enemy'] if h]
    suggestions = None
    if len(enemy_heroes) == len(teams['enemy']):
        suggestions = build_suggestions(enemy_heroes)

    return jsonify({
        'context': match_context,
        'map_fit': current_fit_bonus(),
        'suggestions': suggestions,
    })

def start(port: int = 5000, debug: bool = False):
    """Start the Flask server."""
    app.run(port=port, debug=debug)
