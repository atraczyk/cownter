"""
Module for fetching and analyzing Overwatch 2 hero counter data.
Scrapes counter information from dotesports.com and creates a counter relationship matrix.
"""

import logging
import json
import unicodedata

import pandas as pd
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO)

def normalize_hero_name(name):
    """Normalize hero name by removing spaces and normalizing unicode characters."""
    # Normalize unicode characters (removes accents)
    normalized = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('ASCII')
    # Remove spaces and convert to lowercase for consistency
    return normalized.replace(" ", "").lower()

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

        # logging.info(f"Processed hero: {hero_name}")
        # logging.info(f"\tTank counters: {tank_counters}")
        # logging.info(f"\tDPS counters: {dps_counters}")
        # logging.info(f"\tSupport counters: {support_counters}")

    if not counter_data:
        logging.error("No counter data was parsed from the table")
    else:
        logging.info("Successfully parsed counter data for %d heroes", len(counter_data))

    return counter_data

def get_all_heroes(counter_data):
    """Extract a unique list of all heroes mentioned in the counter data."""
    heroes = set()

    # Add all main heroes
    heroes.update(counter_data.keys())

    # Add all counter heroes
    for hero_data in counter_data.values():
        for counter_list in hero_data.values():
            heroes.update(counter_list)

    return sorted(list(heroes))

def create_counter_matrix(counter_data):
    """
    Create a DataFrame showing which heroes counter which other heroes.
    1 indicates that the row hero counters the column hero.
    """
    heroes = get_all_heroes(counter_data)
    matrix = pd.DataFrame(0, index=heroes, columns=heroes)

    for hero, counters in counter_data.items():
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

def fetch_counter_data():
    """
    Fetch counter data directly from the dotesports website.
    Returns a dictionary containing hero counter information.
    """
    url = "https://dotesports.com/overwatch/news/the-best-counters-for-each-overwatch-2-hero"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        table = get_table_from_response(response)
        counter_data = parse_counter_table(table)
        return counter_data

    except requests.RequestException as e:
        logging.error("Network error fetching counter data: %s", e)
        return None
    except (AttributeError, ValueError) as e:
        logging.error("Error parsing counter data: %s", e)
        return None

def main():
    """Main function to execute the counter data fetching and analysis."""
    # Fetch counter data from website
    counter_data = fetch_counter_data()

    if not counter_data:
        logging.error("Failed to fetch counter data. Exiting.")
        return

    # Create and display the counter matrix
    counter_matrix = create_counter_matrix(counter_data)
    print("\nCounter Matrix:")
    print(counter_matrix)

    # # Get list of all heroes
    # all_heroes = get_all_heroes(counter_data)
    # print(f"\nTotal number of heroes: {len(all_heroes)}")
    # print("All heroes:", all_heroes)

if __name__ == "__main__":
    main()