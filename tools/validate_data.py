"""Validate the versioned data sheets in src/core/data.

Usage: python tools/validate_data.py
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.core.comp_fit import load_sheet, validate_default_sheets  # noqa: E402


def main() -> int:
    errors = validate_default_sheets()
    if errors:
        print(f'{len(errors)} problem(s) found:')
        for error in errors:
            print(f'  - {error}')
        return 1

    for name in ('archetypes', 'maps'):
        sheet = load_sheet(name)
        print(f'{name} {sheet["version"]} ({sheet.get("status", "unknown")}, updated {sheet["updated"]}): OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
