# Overwatch 2 Counter Picker Tests

This directory contains unit tests for the Overwatch 2 Counter Picker application.

## Test Structure

The tests are organized by module:

- `test_utils.py`: Tests for utility functions in `utils.py`
- `test_hero_data_provider.py`: Tests for the `HeroDataProvider` class in `counter_analyzer.py`
- `test_team_validator.py`: Tests for the `TeamValidator` class in `counter_analyzer.py`
- `test_counter_analyzer.py`: Tests for the `CounterAnalyzer` class in `counter_analyzer.py`
- `test_counter_result_formatter.py`: Tests for the `CounterResultFormatter` class in `counter_analyzer.py`

## Running Tests

You can run all tests using the `run_all.py` script:

```bash
python tests/run_all.py
```

Or run individual test files:

```bash
python -m unittest tests/test_utils.py
```

## Test Coverage

You can run tests with coverage using the `run_with_coverage.py` script:

```bash
python tests/run_with_coverage.py
```

This will generate a coverage report in the terminal and an HTML report in the `coverage_html` directory.

> Note: The `coverage_html` directory is not versioned in Git as it contains generated files. Each developer should run the coverage tool locally to generate their own reports.

The tests cover the following functionality:

- Utility functions (Levenshtein distance, name normalization, etc.)
- Hero data loading and processing
- Team validation and normalization
- Counter analysis and suggestions
- Result formatting

## Adding New Tests

When adding new functionality to the application, please add corresponding tests following these guidelines:

1. Create test methods with descriptive names that explain what they're testing
2. Use appropriate assertions to verify expected behavior
3. Mock external dependencies when necessary
4. Follow the existing test structure and patterns