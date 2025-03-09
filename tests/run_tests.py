"""
Test runner for Overwatch 2 counter picker.
"""

import unittest
import sys
import os

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import all test modules
from tests.test_utils import TestLevenshtein, TestNormalizeHeroName, TestGetClosestMatch, TestLoadHeroData, TestValidateTeamComposition
from tests.test_hero_data_provider import TestHeroDataProvider
from tests.test_team_validator import TestTeamValidator
from tests.test_counter_analyzer import TestCounterAnalyzer
from tests.test_counter_result_formatter import TestCounterResultFormatter


def create_test_suite():
    """Create a test suite containing all tests."""
    test_suite = unittest.TestSuite()

    # Add tests from test_utils.py
    test_suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestLevenshtein))
    test_suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestNormalizeHeroName))
    test_suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestGetClosestMatch))
    test_suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestLoadHeroData))
    test_suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestValidateTeamComposition))

    # Add tests from test_hero_data_provider.py
    test_suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestHeroDataProvider))

    # Add tests from test_team_validator.py
    test_suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestTeamValidator))

    # Add tests from test_counter_analyzer.py
    test_suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestCounterAnalyzer))

    # Add tests from test_counter_result_formatter.py
    test_suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestCounterResultFormatter))

    return test_suite


if __name__ == "__main__":
    # Create the test suite
    suite = create_test_suite()

    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Exit with non-zero code if tests failed
    sys.exit(not result.wasSuccessful())