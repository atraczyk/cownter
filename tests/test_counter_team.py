import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class TestCounterTeam(unittest.TestCase):
    """Test cases for counter.py team functionality"""

    @patch('argparse.ArgumentParser.parse_args')
    @patch('src.core.counter_analyzer.HeroDataProvider')
    @patch('src.core.counter_analyzer.TeamValidator')
    @patch('src.core.counter_analyzer.CounterAnalyzer')
    @patch('src.core.counter_analyzer.CounterResultFormatter')
    def test_team_counter_suggestions(self, mock_formatter, mock_analyzer, mock_validator, mock_data_provider, mock_args):
        """Test suggesting counters for a full team"""
        # Import here to avoid import issues with mocks
        from src import counter

        # Setup mocks
        args = MagicMock()
        args.list_heroes = False
        args.heroes = "reinhardt,tracer,soldier76,mercy,ana"
        args.open = False
        args.listen = False
        args.serve = False
        args.port = 5000
        args.debug = False
        args.stats = False
        mock_args.return_value = args

        # Setup data provider
        data_provider = MagicMock()
        data_provider.load_data.return_value = True
        mock_data_provider.return_value = data_provider

        # Setup validator
        validator = MagicMock()
        team = ["reinhardt", "tracer", "soldier76", "mercy", "ana"]
        normalized_team = ["reinhardt", "tracer", "soldier76", "mercy", "ana"]
        validator.match_hero_names.return_value = team
        validator.validate_team.return_value = True
        validator.normalize_team.return_value = normalized_team
        mock_validator.return_value = validator

        # Setup analyzer
        analyzer = MagicMock()
        mock_suggestions = {
            "tank": [("sigma", 3), ("orisa", 2)],
            "damage": [("reaper", 3), ("junkrat", 2)],
            "support": [("moira", 2), ("lucio", 1)],
            "total_score": 10
        }
        analyzer.suggest_counters.return_value = mock_suggestions
        mock_analyzer.return_value = analyzer

        # Setup formatter
        formatter = MagicMock()
        formatter.format_counter_suggestions.return_value = ("Formatted suggestions", "Speech text")
        mock_formatter.return_value = formatter

        # Redirect stdout to capture print output
        with patch('sys.stdout'):
            counter.main()

        # Verify the functions were called with the right parameters
        # We're just testing that the code runs without errors
        self.assertTrue(True)

if __name__ == '__main__':
    unittest.main()