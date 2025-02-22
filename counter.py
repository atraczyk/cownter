"""
Module for fetching and analyzing Overwatch 2 hero counter data.
Scrapes counter information from dotesports.com and creates a counter relationship matrix.
"""

import logging
import json
import unicodedata
import os
import argparse

import pandas as pd
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO)

def normalize_hero_name(name):
    """
    Normalize hero name by removing spaces, accents, and special characters.

    Args:
        name: Hero name string to normalize

    Returns:
        str: Normalized hero name in lowercase without special chars
    """
    # Normalize unicode characters (removes accents)
    normalized = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('ASCII')
    # Remove special characters and spaces, convert to lowercase
    normalized = ''.join(c.lower() for c in normalized if c.isalnum())
    return normalized

def parse_counter_table(table):
    """
    Parse the HTML table containing hero counter data and return a structured dictionary.

    Args:
        table: BeautifulSoup table element containing the counter data

    Returns:
        dict: A dictionary with hero names as keys and their counters as nested dictionaries
        Example:
        {
            "D.Va": {
                "tank_counters": ["Zarya", "Winston"],
                "dps_counters": ["Symmetra", "Sojourn", "Bastion"],
                "support_counters": ["Moira"]
            },
            ...
        }
    """
    counter_data = {}

    # Process each row in the table body
    tbody = table.find('tbody')
    if not tbody:
        logging.error("Could not find table body in the HTML")
        return counter_data

    for row in tbody.find_all('tr'):
        cells = row.find_all('td')
        if len(cells) != 4:  # Skip malformed rows
            continue

        # Extract and normalize hero names
        hero_name = normalize_hero_name(cells[0].text.strip())
        tank_counters = [normalize_hero_name(c) for c in cells[1].text.split(',') if c.strip()]
        dps_counters = [normalize_hero_name(c) for c in cells[2].text.split(',') if c.strip()]
        support_counters = [normalize_hero_name(c) for c in cells[3].text.split(',') if c.strip() and c.strip() != '–']

        counter_data[hero_name] = {
            "tank_counters": tank_counters,
            "dps_counters": dps_counters,
            "support_counters": support_counters
        }

    if not counter_data:
        logging.error("No counter data was parsed from the table")
    else:
        logging.info("Successfully parsed counter data for %d heroes", len(counter_data))

    return counter_data

def get_all_heroes(hero_data):
    """Extract a unique list of all heroes mentioned in the hero data."""
    heroes = set()

    # Add all main heroes
    heroes.update(hero_data.keys())

    # Add all counter heroes
    for hero_info in hero_data.values():
        for counter_list in hero_info['counters'].values():
            heroes.update(counter_list)

    return sorted(list(heroes))

def create_counter_matrix(hero_data):
    """
    Create a DataFrame showing which heroes counter which other heroes.
    1 indicates that the row hero counters the column hero.
    """
    heroes = get_all_heroes(hero_data)
    matrix = pd.DataFrame(0, index=heroes, columns=heroes)

    for hero, hero_info in hero_data.items():
        counters = hero_info['counters']
        for counter_type in ['tank_counters', 'dps_counters', 'support_counters']:
            for counter in counters[counter_type]:
                matrix.at[counter, hero] = 1

    return matrix

def get_table_from_response(response):
    """
    Extract the counter table from the HTTP response.

    Args:
        response: requests.Response object containing the webpage HTML

    Returns:
        BeautifulSoup table element containing the counter data
    """
    soup = BeautifulSoup(response.text, 'html.parser')
    figure = soup.find('figure', class_='wp-block-table')
    return figure.find('table')

def infer_hero_roles(counter_data):
    """
    Infer hero roles based on which counter categories they appear in.
    A hero is classified as a role if they appear in that role's counters list for any hero.
    Heroes that don't appear in any counter lists are marked as 'unknown'.
    """

    # Due to missing counter data for some heroes, we need to supply some heroes with roles
    # manually. The rest will be inferred from the counter data.
    # - hazard
    # - illari
    # - junkerqueen
    # - juno
    # - mercy
    # - venture
    manually_assigned_roles = {
        'hazard': 'tank',
        'illari': 'support',
        'junkerqueen': 'tank',
        'juno': 'support',
        'mercy': 'support',
        'venture': 'dps',
    }

    hero_data = {}
    role_appearances = {hero: {'tank': 0, 'dps': 0, 'support': 0} for hero in counter_data}

    # Count appearances in each role's counter list
    for hero_counters in counter_data.values():
        for counter in hero_counters['tank_counters']:
            if counter in role_appearances:
                role_appearances[counter]['tank'] += 1
        for counter in hero_counters['dps_counters']:
            if counter in role_appearances:
                role_appearances[counter]['dps'] += 1
        for counter in hero_counters['support_counters']:
            if counter in role_appearances:
                role_appearances[counter]['support'] += 1

    # Assign roles based on where heroes appear as counters
    for hero, counters in counter_data.items():
        appearances = role_appearances[hero]
        if appearances['tank'] > 0:
            role = 'tank'
        elif appearances['support'] > 0:
            role = 'support'
        elif appearances['dps'] > 0:
            role = 'dps'
        else:
            role = 'unknown'  # Hero doesn't appear in any counter lists

        # HACK: manually assign roles for heroes that don't appear in the counter data
        if hero in manually_assigned_roles:
            role = manually_assigned_roles[hero]

        hero_data[hero] = {
            'role': role,
            'counters': counters
        }

    # Print heroes with unknown roles
    unknown_heroes = [hero for hero, info in hero_data.items() if info['role'] == 'unknown']
    if unknown_heroes:
        print("\nWarning: Could not determine roles for these heroes:")
        for hero in sorted(unknown_heroes):
            print("- " + hero)

    return hero_data

def fetch_counter_data(force_update=False):
    """
    Fetch hero data from cache or website.
    """
    cache_file = 'hero_data.json'

    # Use cached data unless force update
    if not force_update and os.path.exists(cache_file):
        with open(cache_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    # Fetch fresh data
    url = "https://dotesports.com/overwatch/news/the-best-counters-for-each-overwatch-2-hero"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        table = get_table_from_response(response)
        counter_data = parse_counter_table(table)
        hero_data = infer_hero_roles(counter_data)

        # Cache the data
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(hero_data, f, indent=2)

        return hero_data

    except requests.RequestException as e:
        logging.error("Network error fetching counter data: %s", e)
        return None
    except (AttributeError, ValueError) as e:
        logging.error("Error parsing counter data: %s", e)
        return None

def show_counters_for_heroes(hero_data, hero_list):
    """
    Display counters for specified heroes using normalized names.
    """
    for hero in hero_list:
        normalized = normalize_hero_name(hero)
        if normalized not in hero_data:
            print("\nHero not found: " + hero + " (normalized: " + normalized + ")")
            continue

        hero_info = hero_data[normalized]
        counters = hero_info['counters']
        print("\nCounters for " + normalized + " (" + hero_info['role'] + "):")
        print("\tTank\t:", ", ".join(counters["tank_counters"]))
        print("\tDPS\t:", ", ".join(counters["dps_counters"]))
        print("\tSupport\t:", ", ".join(counters["support_counters"]))

def get_hero_role(hero_name, hero_data):
    """
    Get hero's role from hero data.

    Args:
        hero_name: Normalized hero name
        hero_data: Hero data dictionary

    Returns:
        str: 'tank', 'dps', 'support', or 'unknown'
    """
    return hero_data[hero_name]['role']

def validate_team_composition(hero_list, hero_data, open_queue=False):
    """
    Validate team composition based on role-lock rules.

    Args:
        hero_list: List of hero names to validate
        hero_data: Hero data dictionary containing hero information
        open_queue: If True, allows any composition

    Returns:
        bool: True if composition is valid, False otherwise
    """
    if len(hero_list) not in [1, 5]:
        print("Error: Please provide either 1 hero or a full team of 5 heroes")
        return False

    if len(hero_list) == 1 or open_queue:
        return True

    # Normalize hero names
    normalized_heroes = [normalize_hero_name(h) for h in hero_list]

    # Check if all heroes exist
    for hero, norm in zip(hero_list, normalized_heroes):
        if norm not in hero_data:
            print("\nHero not found: " + hero + " (normalized: " + norm + ")")
            return False

    # Count roles
    roles = [get_hero_role(h, hero_data) for h in normalized_heroes]
    tank_count = roles.count('tank')
    dps_count = roles.count('dps')
    support_count = roles.count('support')

    # Validate 1-2-2 composition
    if tank_count != 1 or dps_count != 2 or support_count != 2:
        print("\nError: Invalid team composition. Required: 1 tank, 2 DPS, 2 support")
        print("\nCurrent: " + str(tank_count) + " tank, " + str(dps_count) + " DPS, " + str(support_count) + " support")
        return False

    return True

def main():
    """Main function to execute the counter data fetching and analysis."""
    parser = argparse.ArgumentParser()
    parser.add_argument('--update', action='store_true', help='Force update counter data from website')
    parser.add_argument('--list-heroes', action='store_true', help='List all available heroes')
    parser.add_argument('--heroes', help='Comma-separated list of 1 or 5 heroes to check counters for')
    parser.add_argument('--open', action='store_true', help='Allow non-role-lock team compositions')
    args = parser.parse_args()

    counter_data = fetch_counter_data(force_update=args.update)
    if not counter_data:
        logging.error("Failed to fetch counter data. Exiting.")
        return

    if args.list_heroes:
        heroes = sorted(counter_data.keys())
        print("\nAvailable Heroes (normalized):")
        for hero in heroes:
            print("- " + hero)
        return

    if args.heroes:
        hero_list = [h.strip() for h in args.heroes.split(',')]
        if not validate_team_composition(hero_list, counter_data, args.open):
            return
        show_counters_for_heroes(counter_data, hero_list)
        return

    # Create and display the counter matrix
    counter_matrix = create_counter_matrix(counter_data)
    print("\nCounter Matrix:")
    print(counter_matrix)

if __name__ == "__main__":
    main()