"""
Tests for the TeamValidator class in counter_analyzer.py
"""

import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.core.counter_analyzer import TeamValidator, HeroDataProvider


class TestTeamValidator(unittest.TestCase):
    """Tests for the TeamValidator class."""

    def setUp(self):
        """Set up test data."""
        # Create a mock HeroDataProvider
        self.mock_provider = MagicMock(spec=HeroDataProvider)
        self.mock_provider.hero_data = {
            "reinhardt": {"role": "tank"},
            "zarya": {"role": "tank"},
            "soldier76": {"role": "damage"},
            "cassidy": {"role": "damage"},
            "genji": {"role": "damage"},
            "mercy": {"role": "support"},
            "lucio": {"role": "support"},
            "ana": {"role": "support"}
        }
        self.validator = TeamValidator(self.mock_provider)

    def test_validate_team(self):
        """Test validating a team."""
        # Test with a valid team
        team = ["reinhardt", "soldier76", "cassidy", "mercy", "lucio"]

        # Patch print to avoid output during tests
        with patch('builtins.print'):
            result = self.validator.validate_team(team)
            self.assertTrue(result)

            # Test with open_queue=True
            result = self.validator.validate_team(team, open_queue=True)
            self.assertTrue(result)

            # Test with an invalid team (3 damage, 1 support, 1 tank)
            invalid_team = ["reinhardt", "soldier76", "cassidy", "genji", "mercy"]
            result = self.validator.validate_team(invalid_team)
            self.assertFalse(result)

            # Test with a single hero
            single_hero = ["reinhardt"]
            result = self.validator.validate_team(single_hero)
            self.assertTrue(result)

    def test_normalize_team(self):
        """Test normalizing team names."""
        # Create a team with mixed case names
        team = ["Reinhardt", "Soldier 76", "CASSIDY", "mercy", "Lúcio"]

        # The actual normalize_hero_name function replaces spaces with hyphens and removes accents
        result = self.validator.normalize_team(team)

        # Check that all names are normalized
        self.assertEqual(result, ["reinhardt", "soldier-76", "cassidy", "mercy", "lucio"])

    def test_match_hero_names(self):
        """Test matching hero names."""
        # Set up the hero_data keys
        self.mock_provider.get_hero_list.return_value = list(self.mock_provider.hero_data.keys())

        # Test with exact matches
        team = ["reinhardt", "soldier76", "cassidy", "mercy", "lucio"]
        result = self.validator.match_hero_names(team)
        self.assertEqual(result, team)

        # Test with close matches (this requires the actual get_closest_match function)
        # Since we can't easily mock get_closest_match's behavior, we'll skip this test
        # and focus on the exact matches test


if __name__ == "__main__":
    unittest.main()