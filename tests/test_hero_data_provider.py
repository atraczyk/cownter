"""
Tests for the HeroDataProvider class in counter_analyzer.py
"""

import unittest
from unittest.mock import patch, MagicMock

from counter_analyzer import HeroDataProvider


class TestHeroDataProvider(unittest.TestCase):
    """Tests for the HeroDataProvider class."""

    @patch('counter_analyzer.load_hero_data')
    def setUp(self, mock_load_hero_data):
        """Set up test data."""
        self.mock_hero_data = {
            "reinhardt": {
                "role": "tank",
                "strong_against": {
                    "tanks": ["dva", "winston"],
                    "damage": ["genji", "tracer"],
                    "supports": ["mercy", "lucio"]
                }
            },
            "dva": {
                "role": "tank",
                "strong_against": {
                    "tanks": [],
                    "damage": ["pharah", "echo"],
                    "supports": ["ana", "baptiste"]
                }
            },
            "genji": {
                "role": "damage",
                "strong_against": {
                    "tanks": [],
                    "damage": [],
                    "supports": ["zenyatta", "ana"]
                }
            },
            "mercy": {
                "role": "support",
                "strong_against": {
                    "tanks": [],
                    "damage": [],
                    "supports": []
                }
            }
        }
        mock_load_hero_data.return_value = self.mock_hero_data
        self.provider = HeroDataProvider()
        self.provider.load_data()

    def test_load_data(self):
        """Test loading hero data."""
        with patch('counter_analyzer.load_hero_data') as mock_load:
            mock_load.return_value = {"hero1": {"role": "tank"}}
            provider = HeroDataProvider()
            result = provider.load_data()
            self.assertTrue(result)
            self.assertEqual(provider.hero_data, {"hero1": {"role": "tank"}})

    def test_load_data_failure(self):
        """Test handling of data loading failure."""
        with patch('counter_analyzer.load_hero_data') as mock_load:
            mock_load.return_value = None
            provider = HeroDataProvider()
            result = provider.load_data()
            self.assertFalse(result)

    def test_infer_weak_against(self):
        """Test inferring weak_against relationships."""
        # Create a custom provider with controlled data for this test
        with patch('counter_analyzer.load_hero_data') as mock_load:
            test_data = {
                "reinhardt": {
                    "role": "tank",
                    "strong_against": {
                        "tanks": ["dva"],
                        "damage": [],
                        "supports": []
                    }
                },
                "genji": {
                    "role": "damage",
                    "strong_against": {
                        "tanks": [],
                        "damage": [],
                        "supports": ["zenyatta"]
                    }
                },
                "dva": {
                    "role": "tank",
                    "strong_against": {
                        "tanks": [],
                        "damage": ["pharah"],
                        "supports": []
                    }
                },
                "zenyatta": {
                    "role": "support",
                    "strong_against": {
                        "tanks": [],
                        "damage": [],
                        "supports": []
                    }
                },
                "pharah": {
                    "role": "damage",
                    "strong_against": {
                        "tanks": [],
                        "damage": [],
                        "supports": []
                    }
                }
            }
            mock_load.return_value = test_data

            test_provider = HeroDataProvider()
            test_provider.load_data()

            # Check that reinhardt is in dva's weak_against tanks
            self.assertIn("reinhardt", test_provider.weak_against_data["dva"]["tanks"])

            # Check that genji is in zenyatta's weak_against damage
            self.assertIn("genji", test_provider.weak_against_data["zenyatta"]["damage"])

            # Check that dva is in pharah's weak_against tanks
            self.assertIn("dva", test_provider.weak_against_data["pharah"]["tanks"])

    def test_get_hero_list(self):
        """Test getting the list of heroes."""
        expected = ["dva", "genji", "mercy", "reinhardt"]
        self.assertEqual(sorted(self.provider.get_hero_list()), expected)

    def test_get_hero_role(self):
        """Test getting a hero's role."""
        self.assertEqual(self.provider.get_hero_role("reinhardt"), "tank")
        self.assertEqual(self.provider.get_hero_role("genji"), "damage")
        self.assertEqual(self.provider.get_hero_role("mercy"), "support")

    def test_hero_data_property(self):
        """Test the hero_data property."""
        self.assertEqual(self.provider.hero_data, self.mock_hero_data)

    def test_weak_against_data_property(self):
        """Test the weak_against_data property."""
        # Reset the provider to test lazy loading
        with patch('counter_analyzer.load_hero_data') as mock_load:
            mock_load.return_value = self.mock_hero_data
            provider = HeroDataProvider()
            # Access weak_against_data without calling load_data first
            weak_against = provider.weak_against_data
            # Verify load_data was called
            mock_load.assert_called_once()
            # Verify weak_against data is correct
            self.assertIn("reinhardt", weak_against["dva"]["tanks"])


if __name__ == "__main__":
    unittest.main()