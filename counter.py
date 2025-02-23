"""
Module for fetching and analyzing Overwatch 2 hero counter data.
Scrapes counter information from dotesports.com and creates a counter relationship matrix.
"""

import logging
import json
import unicodedata
import os
import argparse
from typing import Optional, List

import pandas as pd
import requests
from bs4 import BeautifulSoup
from speech_handler import SpeechHandler

logging.basicConfig(level=logging.INFO)

def levenshtein(s1, s2):
    """Calculate the Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein(s2, s1)  # pylint: disable=arguments-out-of-order
    if not s2:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]

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

    # HACK:Manual overrides:
    # sombra has widowmaker as a tank counter which is wrong, and it should be dva
    counter_data['sombra']['tank_counters'] = ['dva']

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
    Infer hero roles based on which counter categories they appear in most frequently.
    A hero's role is determined by where they appear most often as a counter.
    Heroes that don't appear in any counter lists are marked as 'unknown'.
    """
    # Due to missing counter data for some heroes, we need to supply some heroes with roles manually
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

    # Assign roles based on most frequent appearances
    for hero, counters in counter_data.items():
        appearances = role_appearances[hero]

        # Get role with most appearances
        max_appearances = max(appearances.values())
        if max_appearances > 0:
            # Get all roles that have the max appearances
            possible_roles = [role for role, count in appearances.items()
                            if count == max_appearances]
            # If multiple roles have same count, prefer tank > support > dps
            role = 'tank' if 'tank' in possible_roles else \
                   'support' if 'support' in possible_roles else \
                   'dps' if 'dps' in possible_roles else 'unknown'
        else:
            role = 'unknown'

        # Override with manually assigned roles
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

def suggest_counter_team(hero_data, enemy_team):
    """
    Suggest an optimal counter team composition based on role-lock rules.
    """
    # Count how many times each hero appears as a counter
    counter_scores = {}
    for enemy in enemy_team:
        enemy_info = hero_data[enemy]
        for counter_type in ['tank_counters', 'dps_counters', 'support_counters']:
            for counter in enemy_info['counters'][counter_type]:
                if counter not in counter_scores:
                    counter_scores[counter] = 0
                counter_scores[counter] += 1

    # Group available counters by role
    role_counters = {'tank': [], 'dps': [], 'support': []}
    for hero, score in counter_scores.items():
        if hero in hero_data:  # Only consider heroes we know about
            role = hero_data[hero]['role']
            if role in role_counters:
                role_counters[role].append((hero, score))

    # Sort counters by score within each role
    for role, counters in role_counters.items():
        counters.sort(key=lambda x: x[1], reverse=True)

    # Select top counters for each role
    suggestions = {
        'total_score': sum(score for role, counters in role_counters.items() for _, score in counters),
        'tank': role_counters['tank'][:1],  # Top tank
        'dps': role_counters['dps'][:2],    # Top 2 DPS
        'support': role_counters['support'][:2]  # Top 2 supports
    }

    return suggestions

def get_closest_match(hero, hero_list):
    """
    Get the closest match for a hero name from a list of heroes.
    Uses a combination of prefix matching and phonetic similarity.
    """
    # Common nickname mappings
    nicknames = {
        'bast': 'bastion',
        'cass': 'cassidy',
        'doom': 'doomfist',
        'rein': 'reinhardt',
        'sym': 'symmetra',
        'torb': 'torbjorn',
        'widow': 'widowmaker',
        'ball': 'wreckingball',
        'zen': 'zenyatta',
    }

    # Common misspellings
    phonetic_matches = {
        'farrah': 'pharah',
        'farah': 'pharah',
        'mccree': 'cassidy',
        'ramada': 'ramattra',
        'soldier': 'soldier76',
        'soldier 76': 'soldier76',
    }

    # Check for exact nickname or phonetic match
    hero_lower = hero.lower()
    if hero_lower in nicknames:
        return nicknames[hero_lower]
    if hero_lower in phonetic_matches:
        return phonetic_matches[hero_lower]

    def similarity_score(s1, s2):
        """Calculate similarity score between two strings."""
        s1, s2 = s1.lower(), s2.lower()

        # Bonus for matching prefix
        prefix_bonus = 0
        for i in range(min(len(s1), len(s2))):
            if s1[i] == s2[i]:
                prefix_bonus += 1
            else:
                break

        # Basic Levenshtein distance
        lev_distance = levenshtein(s1, s2)

        # Return combined score (lower is better)
        return lev_distance - (prefix_bonus * 0.5)

    # Find best match using similarity score
    return min(hero_list, key=lambda x: similarity_score(hero, x))

def print_counter_results(suggestions) -> str:
    """
    Print detailed counter suggestions and prepare speech summary.

    Args:
        suggestions: Dictionary containing counter suggestions

    Returns:
        str: Text to be spoken by speech handler
    """
    # Print total score
    total_score = suggestions['total_score']
    print(f"\nTotal score: {total_score}")

    # Print detailed suggestions
    print("Suggested counter picks:")
    for role, counters in suggestions.items():
        if role != 'total_score':  # Skip the score entry
            print(f"\n{role.upper()}:")
            for hero, score in counters:
                print(f"- {hero} (counters {score} enemies)")

    # Create team summary
    counters = []
    for role, heroes in suggestions.items():
        if role != 'total_score':
            for hero, _ in heroes:
                counters.append(hero)
    team_summary = ", ".join(counters)
    print("\nSuggested team: " + team_summary)

    # Prepare speech text
    speech_text = f"Suggested counters: {team_summary}. Total effectiveness score: {total_score}"
    return speech_text

def get_speech_confirmation(handler: SpeechHandler, prompt: str) -> bool:
    """
    Get yes/no confirmation via speech.

    Args:
        handler: SpeechHandler instance
        prompt: Question to ask

    Returns:
        bool: True for yes, False for no
    """
    handler.speak(prompt)
    for _ in range(2):  # Give 2 attempts to get clear yes/no
        result = handler.listen_for_item(timeout=3)
        if result:
            if 'yes' in result.lower() or 'yeah' in result.lower() or 'sure' in result.lower():
                handler.play_sound(True)
                return True
            if 'no' in result.lower() or 'nope' in result.lower():
                handler.play_sound(True)
                return False
        handler.play_sound(False)
    return False  # Default to no if unclear

def get_team_by_voice(handler: SpeechHandler, counter_data: dict) -> Optional[List[str]]:
    """
    Get team composition using voice input.
    """
    def validate_hero(text: str) -> List[str]:
        """
        Validate and normalize hero names from voice input.
        Returns list of valid hero names.
        """
        if not text:
            return []

        # Split input into potential hero names
        potential_heroes = text.split()
        validated_heroes = []

        for hero in potential_heroes:
            # Find closest match
            closest_match = get_closest_match(hero, counter_data.keys())
            print(f"Heard '{hero}', matched to '{closest_match}'")
            validated_heroes.append(closest_match)

        return validated_heroes

    heroes = []
    while len(heroes) < 5:
        result = handler.listen_for_item(
            prompt="Next hero" if not heroes else None,
            timeout=3,
            retries=2
        )

        if not result:
            if get_speech_confirmation(handler, "Would you like to try again?"):
                heroes = []  # Reset and start over
                continue
            return None

        # Get all valid heroes from this utterance
        new_heroes = validate_hero(result)
        if new_heroes:
            # Add heroes until we have 5
            for hero in new_heroes:
                if len(heroes) < 5:
                    heroes.append(hero)
                    print(f"Hero {len(heroes)}/5: {hero}")
                else:
                    print(f"Ignoring extra hero: {hero}")

            if len(heroes) < 5:
                print("Say next hero...")
        else:
            handler.play_sound(False)
            continue

    print("\nUsing team: " + ", ".join(heroes))
    return heroes

def main():
    """Main function to execute the counter data fetching and analysis."""
    parser = argparse.ArgumentParser()
    parser.add_argument('--update', action='store_true', help='Force update counter data from website')
    parser.add_argument('--list-heroes', action='store_true', help='List all available heroes')
    parser.add_argument('--heroes', help='Comma-separated list of 1 or 5 heroes to check counters for')
    parser.add_argument('--open', action='store_true', help='Allow non-role-lock team compositions')
    parser.add_argument('--listen', action='store_true', help='Listen for voice input of enemy team composition')
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

        # Find the closest match for each hero in the counter data
        for i, hero in enumerate(hero_list):
            closest_match = get_closest_match(hero, counter_data.keys())
            hero_list[i] = closest_match

        print("Using team: " + ", ".join(hero_list))

        if not validate_team_composition(hero_list, counter_data, args.open):
            return

        # For single hero, show detailed counters
        if len(hero_list) == 1:
            show_counters_for_heroes(counter_data, hero_list)
        # For full team, only show counter suggestions
        elif len(hero_list) == 5:
            normalized_heroes = [normalize_hero_name(h) for h in hero_list]
            suggestions = suggest_counter_team(counter_data, normalized_heroes)
            print_counter_results(suggestions)
        return

    # Default to listen mode if no other mode specified
    if not (args.list_heroes or args.heroes) or args.listen:
        handler = SpeechHandler()
        while True:
            heroes = get_team_by_voice(handler, counter_data)

            if not heroes:
                if not get_speech_confirmation(handler, "Would you like to try again?"):
                    return
                continue

            if validate_team_composition(heroes, counter_data, args.open):
                normalized_heroes = [normalize_hero_name(h) for h in heroes]
                suggestions = suggest_counter_team(counter_data, normalized_heroes)
                speech_text = print_counter_results(suggestions)
                handler.speak(speech_text)

                # Prompt for another team
                if get_speech_confirmation(handler, "Would you like to check another team?"):
                    continue
                return

    # Only show matrix if explicitly no other mode is active
    if not any([args.list_heroes, args.heroes, args.listen]):
        counter_matrix = create_counter_matrix(counter_data)
        print("\nCounter Matrix:")
        print(counter_matrix)

if __name__ == "__main__":
    main()