import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class TestCounterBasic(unittest.TestCase):
    """Basic test cases for counter.py"""

    def test_web_server(self):
        """Test the web server functionality"""
        # Mock the command line arguments
        with patch('argparse.ArgumentParser.parse_args') as mock_parse_args:
            # Setup mock for parse_args
            mock_args = MagicMock()
            mock_args.list_heroes = False
            mock_args.heroes = None
            mock_args.open = False
            mock_args.listen = False
            mock_args.serve = True
            mock_args.port = 8080
            mock_args.debug = True
            mock_args.stats = False
            mock_parse_args.return_value = mock_args

            # Mock the server.start function
            with patch('src.web.server.start') as mock_server_start:
                # Mock HeroDataProvider
                with patch('src.core.counter_analyzer.HeroDataProvider') as mock_provider_class:
                    # Setup mock for HeroDataProvider
                    mock_provider = MagicMock()
                    mock_provider.load_data.return_value = True
                    mock_provider_class.return_value = mock_provider

                    # Redirect stdout to capture print output
                    with patch('sys.stdout'):
                        # Import counter and run main
                        from src import counter
                        counter.main()

                    # Verify the server was started with the right parameters
                    mock_server_start.assert_called_once_with(port=8080, debug=True)

if __name__ == '__main__':
    unittest.main()