"""
DEPRECATED: Script to fetch and update hero counter data from dotesports.com.
This script is deprecated as we now maintain the hero_data.json file manually.
It is kept for reference purposes only.
"""

import logging
import json
import requests
from bs4 import BeautifulSoup
import warnings

logging.basicConfig(level=logging.INFO)

warnings.warn(
    "This script is deprecated and may be removed in a future version. "
    "Please manually update hero_data.json instead.",
    DeprecationWarning
)

def get_table_from_response(response):
    """Extract the counter table from the HTTP response."""
    soup = BeautifulSoup(response.text, 'html.parser')
    figure = soup.find('figure', class_='wp-block-table')
    return figure.find('table')

def parse_counter_table(table):
    """Parse the HTML table containing hero counter data."""
    counter_data = {}
    tbody = table.find('tbody')

    if not tbody:
        logging.error("Could not find table body in the HTML")
        return counter_data

    for row in tbody.find_all('tr'):
        cells = row.find_all('td')
        if len(cells) != 4:
            continue

        hero_name = cells[0].text.strip().lower()
        tanks = [c.strip().lower() for c in cells[1].text.split(',') if c.strip()]
        damage = [c.strip().lower() for c in cells[2].text.split(',') if c.strip()]
        supports = [c.strip().lower() for c in cells[3].text.split(',') if c.strip() and c.strip() != '–']

        counter_data[hero_name] = {
            "role": "unknown",  # Role will be inferred later
            "strong_against": {
                "tanks": tanks,
                "damage": damage,
                "supports": supports
            }
        }

    return counter_data

def infer_hero_roles(counter_data):
    """Infer hero roles based on counter categories."""
    role_appearances = {hero: {'tank': 0, 'damage': 0, 'support': 0}
                       for hero in counter_data.keys()}

    # Count appearances in each role's counter list
    for hero_info in counter_data.values():
        strong_against = hero_info['strong_against']
        for counter in strong_against['tanks']:
            if counter in role_appearances:
                role_appearances[counter]['tank'] += 1
        for counter in strong_against['damage']:
            if counter in role_appearances:
                role_appearances[counter]['damage'] += 1
        for counter in strong_against['supports']:
            if counter in role_appearances:
                role_appearances[counter]['support'] += 1

    # Assign roles based on most frequent appearances
    for hero in counter_data:
        appearances = role_appearances[hero]
        max_appearances = max(appearances.values())
        if max_appearances > 0:
            possible_roles = [role for role, count in appearances.items()
                            if count == max_appearances]
            role = ('tank' if 'tank' in possible_roles else
                   'support' if 'support' in possible_roles else
                   'damage' if 'damage' in possible_roles else 'unknown')
        else:
            role = 'unknown'

        counter_data[hero]['role'] = role

    return counter_data

def main():
    """Main function to fetch and update hero data."""
    url = "https://dotesports.com/overwatch/news/the-best-counters-for-each-overwatch-2-hero"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        table = get_table_from_response(response)
        counter_data = parse_counter_table(table)
        hero_data = infer_hero_roles(counter_data)

        with open('hero_data_new.json', 'w', encoding='utf-8') as f:
            json.dump(hero_data, f, indent=2)

        print("\nNOTE: Data has been written to hero_data_new.json")
        print("This is a deprecated script. Please manually verify and update hero_data.json instead.")

        # Print unknown roles for manual review
        unknown_heroes = [hero for hero, info in hero_data.items()
                         if info['role'] == 'unknown']
        if unknown_heroes:
            print("\nWarning: Could not determine roles for these heroes:")
            for hero in sorted(unknown_heroes):
                print(f"- {hero}")

    except requests.RequestException as e:
        logging.error("Network error fetching counter data: %s", e)
    except (AttributeError, ValueError) as e:
        logging.error("Error parsing counter data: %s", e)

if __name__ == "__main__":
    main()