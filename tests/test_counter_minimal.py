import unittest
from unittest.mock import patch
import sys
import os

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class TestCounterMinimal(unittest.TestCase):
    """Minimal test cases for counter.py"""

    @patch('src.counter.main')
    def test_import_and_main(self, mock_main):
        """Test that counter.py can be imported and main can be called"""
        # Import the module
        from src import counter

        # Call the main function (which is mocked)
        counter.main()

        # Verify that main was called
        mock_main.assert_called_once()

if __name__ == '__main__':
    unittest.main()