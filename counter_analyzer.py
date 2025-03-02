"""
Overwatch 2 counter analyzer module.
Provides classes for analyzing hero counter relationships and suggesting optimal team compositions.
"""

import logging
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple

from utils import (
    normalize_hero_name,
    get_closest_match,
    load_hero_data,
    validate_team_composition,
    suggest_counter_team
)

class HeroDataProvider:
    """Responsible for loading and providing access to hero data."""

    def __init__(self, data_path: str = 'hero_data.json'):
        """Initialize with path to hero data file."""
        self.data_path = data_path
        self._hero_data = None

    def load_data(self) -> bool:
        """Load hero data from file."""
        self._hero_data = load_hero_data()
        return self._hero_data is not None

    @property
    def hero_data(self) -> Dict[str, Any]:
        """Get the hero data."""
        if not self._hero_data:
            self.load_data()
        return self._hero_data

    def get_hero_list(self) -> List[str]:
        """Get sorted list of all heroes."""
        return sorted(self.hero_data.keys())

    def get_hero_role(self, hero_name: str) -> str:
        """Get the role of a hero."""
        return self.hero_data[hero_name]['role']


class TeamValidator:
    """Validates team compositions based on role-lock rules."""

    def __init__(self, data_provider: HeroDataProvider):
        """Initialize with a hero data provider."""
        self.data_provider = data_provider

    def validate_team(self, hero_list: List[str], open_queue: bool = False) -> bool:
        """Validate a team composition."""
        return validate_team_composition(hero_list, self.data_provider.hero_data, open_queue)

    def normalize_team(self, hero_list: List[str]) -> List[str]:
        """Normalize hero names in a team list."""
        return [normalize_hero_name(h) for h in hero_list]

    def match_hero_names(self, hero_list: List[str]) -> List[str]:
        """Find closest matches for hero names."""
        hero_data = self.data_provider.hero_data
        return [get_closest_match(hero, hero_data.keys()) for hero in hero_list]


class CounterAnalyzer:
    """Analyzes hero counter relationships and suggests optimal team compositions."""

    def __init__(self, data_provider: HeroDataProvider):
        """Initialize with a hero data provider."""
        self.data_provider = data_provider

    def suggest_counters(self, enemy_team: List[str]) -> Dict[str, Any]:
        """Suggest optimal counter picks for an enemy team."""
        return suggest_counter_team(self.data_provider.hero_data, enemy_team)

    def show_hero_counters(self, hero: str) -> Dict[str, List[str]]:
        """Get counters for a specific hero."""
        hero_data = self.data_provider.hero_data
        normalized = normalize_hero_name(hero)

        if normalized not in hero_data:
            return {}

        return hero_data[normalized]['strong_against']

    def create_counter_matrix(self) -> pd.DataFrame:
        """Create a matrix showing counter relationships between heroes."""
        hero_data = self.data_provider.hero_data
        heroes = sorted(hero_data.keys())
        matrix = pd.DataFrame(0, index=heroes, columns=heroes)

        for hero, info in hero_data.items():
            for role, counters in info['strong_against'].items():
                for counter in counters:
                    if counter in matrix.columns:
                        matrix.loc[hero, counter] = 1

        return matrix


class CounterResultFormatter:
    """Formats counter analysis results for display."""

    def format_hero_counters(self, hero: str, counters: Dict[str, List[str]], role: str) -> str:
        """Format counters for a specific hero."""
        result = f"\nCounters for {hero} ({role}):\n"
        result += f"\tTank\t: {', '.join(counters['tanks'])}\n"
        result += f"\tDamage\t: {', '.join(counters['damage'])}\n"
        result += f"\tSupport\t: {', '.join(counters['supports'])}"
        return result

    def format_counter_suggestions(self, suggestions: Dict[str, Any]) -> Tuple[str, str]:
        """Format counter suggestions for display and speech."""
        total_score = suggestions['total_score']
        result = f"\nTotal score: {total_score}\n"
        result += "Suggested counter picks:\n"

        counters = []
        for role, heroes in suggestions.items():
            if role != 'total_score':
                result += f"\n{role.upper()}:\n"
                for hero, score in heroes:
                    result += f"- {hero} (counters {score} enemies)\n"
                    counters.append(hero)

        team_summary = ", ".join(counters)
        result += f"\nSuggested team: {team_summary}"

        speech_text = f"Suggested counters: {team_summary}. Total effectiveness score: {total_score}"
        return result, speech_text