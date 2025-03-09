"""
Run tests with coverage.
"""

import unittest
import sys
import os
import coverage

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

if __name__ == "__main__":
    # Start coverage
    cov = coverage.Coverage(
        source=["src"],
        omit=["tests/*", "*.venv*", "*site-packages*"]
    )
    cov.start()

    # Import the modules to be tested to ensure they are covered
    from src.core import counter_analyzer
    from src.utils import utils
    from src.web import server
    from src.voice import speech_handler, voice_handler

    # Use unittest discover to find and run all tests
    test_loader = unittest.TestLoader()
    test_suite = test_loader.discover(os.path.dirname(__file__), pattern="test_*.py")

    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)

    # Stop coverage
    cov.stop()
    cov.save()

    # Print coverage report
    print("\nCoverage Report:")
    try:
        cov.report()
        # Generate HTML report
        cov.html_report(directory="coverage_html")
        print("\nHTML coverage report generated in coverage_html directory")
    except Exception as e:
        print(f"Error generating coverage report: {e}")

    # Exit with non-zero code if tests failed
    sys.exit(not result.wasSuccessful())