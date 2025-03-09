"""
Tests for the TeamValidator class in counter_analyzer.py
"""

import unittest
from unittest.mock import patch, MagicMock

from counter_analyzer import TeamValidator, HeroDataProvider


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

    @patch('counter_analyzer.validate_team_composition')
    def test_validate_team(self, mock_validate):
        """Test team validation."""
        # Set up the mock to return True
        mock_validate.return_value = True

        # Test with a valid team
        team = ["reinhardt", "soldier76", "cassidy", "mercy", "lucio"]
        result = self.validator.validate_team(team)

        # Verify validate_team_composition was called with the right arguments
        mock_validate.assert_called_once_with(team, self.mock_provider.hero_data, False)
        self.assertTrue(result)

        # Reset the mock and test with open_queue=True
        mock_validate.reset_mock()
        mock_validate.return_value = True

        result = self.validator.validate_team(team, open_queue=True)
        mock_validate.assert_called_once_with(team, self.mock_provider.hero_data, True)
        self.assertTrue(result)

    def test_normalize_team(self):
        """Test team normalization."""
        # Create a team with mixed case names
        team = ["Reinhardt", "Soldier 76", "CASSIDY", "mercy", "Lúcio"]

        # Mock the normalize_hero_name function to return lowercase
        with patch('counter_analyzer.normalize_hero_name', side_effect=lambda x: x.lower()):
            result = self.validator.normalize_team(team)

            # Check that all names are normalized
            self.assertEqual(result, ["reinhardt", "soldier 76", "cassidy", "mercy", "lúcio"])

    @patch('counter_analyzer.get_closest_match')
    def test_match_hero_names(self, mock_get_closest):
        """Test matching hero names."""
        # Set up the mock to return specific values
        mock_get_closest.side_effect = lambda hero, hero_list: {
            "rein": "reinhardt",
            "soldier": "soldier76",
            "cass": "cassidy",
            "mercy": "mercy",
            "lucio": "lucio"
        }[hero]

        # Test with nicknames and abbreviations
        team = ["rein", "soldier", "cass", "mercy", "lucio"]
        result = self.validator.match_hero_names(team)

        # Check that all names are matched correctly
        expected = ["reinhardt", "soldier76", "cassidy", "mercy", "lucio"]
        self.assertEqual(result, expected)

        # Verify get_closest_match was called for each hero
        self.assertEqual(mock_get_closest.call_count, 5)


if __name__ == "__main__":
    unittest.main()