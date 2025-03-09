"""
Tests for utility functions in utils.py
"""

import unittest
import json
from unittest.mock import patch, mock_open
import sys
import os

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.utils.utils import (
    levenshtein,
    normalize_hero_name,
    get_closest_match,
    load_hero_data,
    validate_team_composition
)


class TestLevenshtein(unittest.TestCase):
    """Tests for the Levenshtein distance function."""

    def test_identical_strings(self):
        """Test that identical strings have a distance of 0."""
        self.assertEqual(levenshtein("hello", "hello"), 0)

    def test_empty_strings(self):
        """Test with empty strings."""
        self.assertEqual(levenshtein("", ""), 0)
        self.assertEqual(levenshtein("hello", ""), 5)
        self.assertEqual(levenshtein("", "hello"), 5)

    def test_different_strings(self):
        """Test with different strings."""
        self.assertEqual(levenshtein("kitten", "sitting"), 3)
        self.assertEqual(levenshtein("saturday", "sunday"), 3)


class TestNormalizeHeroName(unittest.TestCase):
    """Tests for the normalize_hero_name function."""

    def test_lowercase_conversion(self):
        """Test that names are converted to lowercase."""
        self.assertEqual(normalize_hero_name("Reinhardt"), "reinhardt")
        self.assertEqual(normalize_hero_name("D.Va"), "dva")

    def test_space_replacement(self):
        """Test that spaces are replaced with hyphens."""
        self.assertEqual(normalize_hero_name("Soldier 76"), "soldier-76")

    def test_accent_removal(self):
        """Test that accents are removed."""
        self.assertEqual(normalize_hero_name("Lúcio"), "lucio")
        self.assertEqual(normalize_hero_name("Torbjörn"), "torbjorn")

    def test_special_character_removal(self):
        """Test that special characters are removed."""
        self.assertEqual(normalize_hero_name("D.Va"), "dva")
        self.assertEqual(normalize_hero_name("Soldier: 76"), "soldier-76")

    def test_double_hyphen_handling(self):
        """Test that double hyphens are handled correctly."""
        self.assertEqual(normalize_hero_name("Soldier  76"), "soldier-76")


class TestGetClosestMatch(unittest.TestCase):
    """Tests for the get_closest_match function."""

    def setUp(self):
        """Set up test data."""
        self.hero_list = ["reinhardt", "winston", "zarya", "dva", "orisa", "sigma"]

    def test_exact_match(self):
        """Test that exact matches are returned correctly."""
        self.assertEqual(get_closest_match("reinhardt", self.hero_list), "reinhardt")
        self.assertEqual(get_closest_match("winston", self.hero_list), "winston")

    def test_case_insensitive(self):
        """Test that matching is case insensitive."""
        self.assertEqual(get_closest_match("Reinhardt", self.hero_list), "reinhardt")
        self.assertEqual(get_closest_match("WINSTON", self.hero_list), "winston")

    def test_nickname_matching(self):
        """Test that nicknames are matched correctly."""
        self.assertEqual(get_closest_match("rein", self.hero_list), "reinhardt")

    def test_typo_handling(self):
        """Test that typos are handled correctly."""
        self.assertEqual(get_closest_match("reinhadt", self.hero_list), "reinhardt")
        self.assertEqual(get_closest_match("winstan", self.hero_list), "winston")

    def test_phonetic_matching(self):
        """Test that phonetic matches work."""
        # Create a list with phonetic match possibilities
        phonetic_list = ["pharah", "cassidy"]
        self.assertEqual(get_closest_match("farrah", phonetic_list), "pharah")
        self.assertEqual(get_closest_match("mccree", phonetic_list), "cassidy")


class TestLoadHeroData(unittest.TestCase):
    """Tests for the load_hero_data function."""

    @patch("builtins.open", new_callable=mock_open, read_data='{"hero1": {"role": "tank"}}')
    def test_successful_load(self, mock_file):
        """Test successful loading of hero data."""
        result = load_hero_data()
        # Check that the file was opened (don't check the exact path as it may vary)
        self.assertEqual(mock_file.call_count, 1)
        self.assertEqual(result, {"hero1": {"role": "tank"}})

    @patch("builtins.open", side_effect=FileNotFoundError)
    def test_file_not_found(self, mock_file):
        """Test handling of file not found error."""
        result = load_hero_data()
        self.assertIsNone(result)

    @patch("builtins.open", new_callable=mock_open, read_data='invalid json')
    def test_invalid_json(self, mock_file):
        """Test handling of invalid JSON."""
        result = load_hero_data()
        self.assertIsNone(result)


class TestValidateTeamComposition(unittest.TestCase):
    """Tests for the validate_team_composition function."""

    def setUp(self):
        """Set up test data."""
        self.hero_data = {
            "reinhardt": {"role": "tank"},
            "soldier76": {"role": "damage"},
            "cassidy": {"role": "damage"},
            "genji": {"role": "damage"},
            "mercy": {"role": "support"},
            "lucio": {"role": "support"},
            "ana": {"role": "support"}
        }

    def test_single_hero(self):
        """Test validation of a single hero."""
        self.assertTrue(validate_team_composition(["reinhardt"], self.hero_data))

    def test_valid_team(self):
        """Test validation of a valid team composition."""
        team = ["reinhardt", "soldier76", "cassidy", "mercy", "lucio"]
        self.assertTrue(validate_team_composition(team, self.hero_data))

    def test_invalid_team_size(self):
        """Test validation of an invalid team size."""
        team = ["reinhardt", "soldier76", "cassidy"]
        self.assertFalse(validate_team_composition(team, self.hero_data))

    def test_open_queue(self):
        """Test validation with open queue enabled."""
        team = ["reinhardt", "soldier76", "cassidy", "genji", "mercy"]
        self.assertTrue(validate_team_composition(team, self.hero_data, open_queue=True))


if __name__ == "__main__":
    unittest.main()