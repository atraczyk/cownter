"""
Tests for the web server API endpoints.
"""

import unittest
import json
import sys
import os
from unittest.mock import patch, MagicMock

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import after path setup
from src.web.server import app
from src.core.counter_analyzer import HeroDataProvider, TeamValidator, CounterAnalyzer


class TestWebServer(unittest.TestCase):
    """Test cases for the web server API endpoints."""

    def setUp(self):
        """Set up the test client and mock dependencies."""
        # Configure the Flask test client
        app.config['TESTING'] = True
        self.client = app.test_client()

        # Create mock for data provider
        self.mock_data_provider = MagicMock(spec=HeroDataProvider)
        self.mock_data_provider.hero_data = {
            'reinhardt': {'role': 'tank', 'strong_against': ['dva', 'winston'], 'weak_against': ['reaper', 'junkrat']},
            'mercy': {'role': 'support', 'strong_against': ['pharah', 'echo'], 'weak_against': ['tracer', 'genji']},
            'genji': {'role': 'damage', 'strong_against': ['mercy', 'zenyatta'], 'weak_against': ['winston', 'moira']},
            'tracer': {'role': 'damage', 'strong_against': ['zenyatta', 'mercy'], 'weak_against': ['brigitte', 'torbjorn']},
            'lucio': {'role': 'support', 'strong_against': ['reinhardt', 'dva'], 'weak_against': ['pharah', 'sombra']},
            'winston': {'role': 'tank', 'strong_against': ['genji', 'widowmaker'], 'weak_against': ['reaper', 'roadhog']},
            'zenyatta': {'role': 'support', 'strong_against': ['winston', 'roadhog'], 'weak_against': ['tracer', 'genji']},
            'reaper': {'role': 'damage', 'strong_against': ['reinhardt', 'winston'], 'weak_against': ['pharah', 'echo']},
            'pharah': {'role': 'damage', 'strong_against': ['reaper', 'junkrat'], 'weak_against': ['widowmaker', 'ashe']},
            'moira': {'role': 'support', 'strong_against': ['genji', 'tracer'], 'weak_against': ['ana', 'baptiste']}
        }
        self.mock_data_provider.get_hero_list.return_value = list(self.mock_data_provider.hero_data.keys())
        self.mock_data_provider.get_hero_role.side_effect = lambda hero: self.mock_data_provider.hero_data[hero]['role']

        # Create mock for team validator
        self.mock_team_validator = MagicMock(spec=TeamValidator)
        self.mock_team_validator.match_hero_names.side_effect = lambda x: x
        self.mock_team_validator.normalize_team.side_effect = lambda x: x

        # Create mock for counter analyzer
        self.mock_counter_analyzer = MagicMock(spec=CounterAnalyzer)

        # Add data_provider attribute to the counter analyzer mock
        self.mock_counter_analyzer.data_provider = self.mock_data_provider

        # Mock counter suggestions
        self.mock_counter_analyzer.suggest_counters.return_value = {
            'tank': [('winston', 2.5)],
            'damage': [('reaper', 3.0), ('pharah', 2.0)],
            'support': [('moira', 2.5), ('zenyatta', 1.5)],
            'total_score': 11.5,
            'synergy_bonus': 2.0
        }

        # Mock team stats
        self.mock_counter_analyzer.compute_team_stats.return_value = {
            'total_counter_score': 8.5,
            'synergy_bonus': 2.0,
            'team': {
                'tank_1': {
                    'hero': 'winston',
                    'role': 'tank',
                    'strong_against': ['genji', 'mercy'],
                    'counter_score': 2.5
                },
                'damage_1': {
                    'hero': 'reaper',
                    'role': 'damage',
                    'strong_against': ['reinhardt', 'winston'],
                    'counter_score': 3.0
                },
                'damage_2': {
                    'hero': 'pharah',
                    'role': 'damage',
                    'strong_against': ['reaper', 'junkrat'],
                    'counter_score': 2.0
                },
                'support_1': {
                    'hero': 'moira',
                    'role': 'support',
                    'strong_against': ['genji', 'tracer'],
                    'counter_score': 2.5
                },
                'support_2': {
                    'hero': 'zenyatta',
                    'role': 'support',
                    'strong_against': ['winston', 'roadhog'],
                    'counter_score': 1.5
                }
            }
        }

        # Mock enemy stats
        self.mock_counter_analyzer.compute_enemy_stats.return_value = {
            'total_counter_score': 5.0,
            'team': {
                'tank_1': {
                    'hero': 'reinhardt',
                    'role': 'tank',
                    'strong_against': ['dva', 'winston'],
                    'counter_score': 1.0
                },
                'damage_1': {
                    'hero': 'genji',
                    'role': 'damage',
                    'strong_against': ['mercy', 'zenyatta'],
                    'counter_score': 1.0
                },
                'damage_2': {
                    'hero': 'tracer',
                    'role': 'damage',
                    'strong_against': ['zenyatta', 'mercy'],
                    'counter_score': 1.0
                },
                'support_1': {
                    'hero': 'mercy',
                    'role': 'support',
                    'strong_against': ['pharah', 'echo'],
                    'counter_score': 1.0
                },
                'support_2': {
                    'hero': 'lucio',
                    'role': 'support',
                    'strong_against': ['reinhardt', 'dva'],
                    'counter_score': 1.0
                }
            }
        }

        # Apply patches
        self.patcher1 = patch('src.web.server.data_provider', self.mock_data_provider)
        self.patcher2 = patch('src.web.server.team_validator', self.mock_team_validator)
        self.patcher3 = patch('src.web.server.counter_analyzer', self.mock_counter_analyzer)

        self.patcher1.start()
        self.patcher2.start()
        self.patcher3.start()

        # Set up teams for testing
        self.enemy_team = ['reinhardt', 'genji', 'tracer', 'mercy', 'lucio']
        self.counter_team = ['winston', 'reaper', 'pharah', 'moira', 'zenyatta']

    def tearDown(self):
        """Clean up after tests."""
        self.patcher1.stop()
        self.patcher2.stop()
        self.patcher3.stop()

    def test_index_route(self):
        """Test the index route returns the main page."""
        with patch('src.web.server.render_template', return_value='index page'):
            response = self.client.get('/')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data.decode('utf-8'), 'index page')

    def test_get_heroes(self):
        """Test the /api/heroes endpoint returns the list of heroes."""
        response = self.client.get('/api/heroes')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(set(data), set(self.mock_data_provider.hero_data.keys()))

    def test_match_hero(self):
        """Test the /api/match/<hero> endpoint returns the matched hero."""
        self.mock_team_validator.match_hero_names.return_value = ['reinhardt']
        response = self.client.get('/api/match/rein')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('match', data)
        self.assertEqual(data['match'], 'rein')
        self.mock_team_validator.match_hero_names.assert_called_once_with(['rein'])

    def test_update_team(self):
        """Test the /api/update_team endpoint updates the team state."""
        # Mock is_duplicate_hero to return False
        with patch('src.web.server.is_duplicate_hero', return_value=False), \
             patch('src.web.server.counter_analyzer.suggest_counters', return_value={}):
            response = self.client.post('/api/update_team',
                                        data=json.dumps({
                                            'team': 'enemy',
                                            'slot': 0,
                                            'hero': 'reinhardt'
                                        }),
                                        content_type='application/json')
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIn('teams', data)
            self.assertEqual(data['teams']['enemy'][0], 'reinhardt')

    def test_update_team_duplicate(self):
        """Test the /api/update_team endpoint handles duplicate heroes."""
        # Mock is_duplicate_hero to return True
        with patch('src.web.server.is_duplicate_hero', return_value=True):
            response = self.client.post('/api/update_team',
                                        data=json.dumps({
                                            'team': 'enemy',
                                            'slot': 0,
                                            'hero': 'reinhardt'
                                        }),
                                        content_type='application/json')
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIn('error', data)

    def test_clear_team(self):
        """Test the /api/clear_team endpoint clears the team state."""
        # First set a team
        with patch('src.web.server.is_duplicate_hero', return_value=False):
            self.client.post('/api/update_team',
                            data=json.dumps({
                                'team': 'enemy',
                                'slot': 0,
                                'hero': 'reinhardt'
                            }),
                            content_type='application/json')

        # Then clear it
        response = self.client.post('/api/clear_team',
                                    data=json.dumps({'team': 'enemy'}),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('teams', data)
        self.assertEqual(data['teams']['enemy'], [None, None, None, None, None])

    def test_get_heroes_with_roles(self):
        """Test the /api/heroes_with_roles endpoint returns heroes grouped by role."""
        response = self.client.get('/api/heroes_with_roles')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        # Check that all heroes are present with their roles
        for hero, hero_data in self.mock_data_provider.hero_data.items():
            self.assertIn(hero, data)
            self.assertEqual(data[hero]['role'], hero_data['role'])

    def test_restore_teams(self):
        """Test the /api/restore_teams endpoint restores saved teams."""
        # Set up teams to restore
        teams_data = {
            'enemy': self.enemy_team,
            'counter': self.counter_team
        }

        response = self.client.post('/api/restore_teams',
                                   data=json.dumps(teams_data),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('teams', data)
        self.assertEqual(data['teams']['enemy'], self.enemy_team)
        self.assertEqual(data['teams']['counter'], self.counter_team)

    def test_current_scores(self):
        """Test the /api/current_scores endpoint returns team scores and stats."""
        # Set up teams directly in the server's teams variable
        with patch('src.web.server.teams', {
            'enemy': self.enemy_team,
            'counter': self.counter_team
        }):
            # Test the current_scores endpoint
            response = self.client.get('/api/current_scores')
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)

            # Check structure of response
            self.assertIn('current_scores', data)
            self.assertIn('enemy_scores', data)
            self.assertIn('team_stats', data)
            self.assertIn('enemy_stats', data)

            # Check team stats
            self.assertEqual(data['team_stats']['total_counter_score'], 8.5)
            self.assertEqual(data['team_stats']['synergy_bonus'], 2.0)

            # Check enemy stats
            self.assertEqual(data['enemy_stats']['total_counter_score'], 5.0)

            # Verify counter analyzer was called with correct parameters
            self.mock_counter_analyzer.compute_team_stats.assert_called()
            self.mock_counter_analyzer.compute_enemy_stats.assert_called()

    def test_server_start(self):
        """Test the server start function."""
        with patch('flask.Flask.run') as mock_run:
            from src.web.server import start

            # Test with default parameters
            start()
            mock_run.assert_called_once_with(port=5000, debug=False)
            mock_run.reset_mock()

            # Test with custom parameters
            start(port=8080, debug=True)
            mock_run.assert_called_once_with(port=8080, debug=True)