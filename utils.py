"""
Shared utility functions for Overwatch 2 counter picker.
"""

import json
import logging
import unicodedata
from typing import List, Dict, Any

def levenshtein(s1: str, s2: str) -> int:
    """Calculate the Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein(s2, s1)
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

def normalize_hero_name(name: str) -> str:
    """
    Normalize hero name by removing spaces, accents, and special characters.
    Preserves hyphens for heroes like soldier-76.
    """
    normalized = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('ASCII')
    normalized = normalized.lower()
    normalized = normalized.replace(' ', '-')
    normalized = ''.join(c for c in normalized if c.isalnum() or c == '-')
    while '--' in normalized:
        normalized = normalized.replace('--', '-')
    return normalized

def get_closest_match(hero: str, hero_list: List[str]) -> str:
    """Get the closest match for a hero name from a list of heroes."""
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

    phonetic_matches = {
        'farrah': 'pharah',
        'farah': 'pharah',
        'mccree': 'cassidy',
        'ramada': 'ramattra',
        'soldier': 'soldier76',
        'soldier 76': 'soldier76',
    }

    hero_lower = hero.lower()
    if hero_lower in nicknames:
        return nicknames[hero_lower]
    if hero_lower in phonetic_matches:
        return phonetic_matches[hero_lower]

    def similarity_score(s1: str, s2: str) -> float:
        s1, s2 = s1.lower(), s2.lower()
        prefix_bonus = 0
        for i in range(min(len(s1), len(s2))):
            if s1[i] == s2[i]:
                prefix_bonus += 1
            else:
                break
        lev_distance = levenshtein(s1, s2)
        return lev_distance - (prefix_bonus * 0.5)

    return min(hero_list, key=lambda x: similarity_score(hero, x))

def load_hero_data() -> Dict[str, Any]:
    """Load hero data from the JSON file."""
    try:
        with open('hero_data.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        logging.error("Error loading hero_data.json: %s", str(e))
        return None

def validate_team_composition(hero_list: List[str], hero_data: Dict[str, Any], open_queue: bool = False) -> bool:
    """Validate team composition based on role-lock rules."""
    if len(hero_list) not in [1, 5]:
        print("Error: Please provide either 1 hero or a full team of 5 heroes")
        return False

    if len(hero_list) == 1 or open_queue:
        return True

    normalized_heroes = [normalize_hero_name(h) for h in hero_list]

    for hero, norm in zip(hero_list, normalized_heroes):
        if norm not in hero_data:
            print(f"\nHero not found: {hero} (normalized: {norm})")
            return False

    roles = [hero_data[h]['role'] for h in normalized_heroes]
    tank_count = roles.count('tank')
    damage_count = roles.count('damage')
    support_count = roles.count('support')

    if tank_count != 1 or damage_count != 2 or support_count != 2:
        print(f"\nError: Invalid team composition. Required: 1 tank, 2 damage, 2 support")
        print(f"\nCurrent: {tank_count} tank, {damage_count} damage, {support_count} support")
        return False

    return True

def suggest_counter_team(hero_data: Dict[str, Any], enemy_team: List[str]) -> Dict[str, Any]:
    """Suggest an optimal counter team composition."""
    counter_scores = {}
    for enemy in enemy_team:
        enemy_info = hero_data[enemy]
        for role, heroes in enemy_info['strong_against'].items():
            for counter in heroes:
                if counter not in counter_scores:
                    counter_scores[counter] = 0
                counter_scores[counter] += 1

    role_counters = {'tank': [], 'damage': [], 'support': []}
    for hero, score in counter_scores.items():
        if hero in hero_data:
            role = hero_data[hero]['role']
            if role in role_counters:
                role_counters[role].append((hero, score))

    for role, counters in role_counters.items():
        counters.sort(key=lambda x: x[1], reverse=True)

    return {
        'total_score': sum(score for role, counters in role_counters.items() for _, score in counters),
        'tank': role_counters['tank'][:1],
        'damage': role_counters['damage'][:2],
        'support': role_counters['support'][:2]
    }