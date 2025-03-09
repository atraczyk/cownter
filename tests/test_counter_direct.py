import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.core.counter_analyzer import CounterAnalyzer
from src.utils.utils import normalize_hero_name

class TestCounterDirect(unittest.TestCase):
    """Direct test cases for counter.py functionality"""

    @patch('src.core.counter_analyzer.normalize_hero_name')
    def test_show_hero_counters(self, mock_normalize):
        """Test the show_hero_counters function directly"""
        # Setup the normalize_hero_name mock
        mock_normalize.return_value = "ana"

        # Create a mock data provider
        data_provider = MagicMock()

        # Setup the mock to return appropriate data
        hero_data = {
            "ana": {
                "strong_against": {
                    "tanks": ["sigma", "orisa"],
                    "damage": ["genji", "tracer"],
                    "support": ["moira", "lucio"]
                }
            }
        }
        data_provider.hero_data = hero_data

        # Create the analyzer with the mock data provider
        analyzer = CounterAnalyzer(data_provider)

        # Call the function
        result = analyzer.show_hero_counters("ana")

        # Verify the result
        expected = {
            "tanks": ["sigma", "orisa"],
            "damage": ["genji", "tracer"],
            "support": ["moira", "lucio"]
        }
        self.assertEqual(result, expected)
        mock_normalize.assert_called_once_with("ana")

if __name__ == '__main__':
    unittest.main()