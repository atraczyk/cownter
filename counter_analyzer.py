"""
Overwatch 2 counter analyzer module.
Provides classes for analyzing hero counter relationships and suggesting optimal team compositions.
"""

import logging
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

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
        self._weak_against_data = None

    def load_data(self) -> bool:
        """Load hero data from file."""
        self._hero_data = load_hero_data()
        if self._hero_data:
            self._weak_against_data = self._infer_weak_against()
            return True
        return False

    def _infer_weak_against(self) -> Dict[str, Dict[str, List[str]]]:
        """Infer weak_against relationships from strong_against data."""
        weak_against = defaultdict(lambda: {"tanks": [], "damage": [], "supports": []})

        for hero, data in self._hero_data.items():
            if "strong_against" in data:
                role = data["role"]
                # Map singular role to plural category
                role_category = role + "s" if role != "damage" else role

                for role_target, strong_targets in data["strong_against"].items():
                    for target in strong_targets:
                        if target in self._hero_data:
                            weak_against[target][role_category].append(hero)

        return weak_against

    @property
    def hero_data(self) -> Dict[str, Any]:
        """Get the hero data."""
        if not self._hero_data:
            self.load_data()
        return self._hero_data

    @property
    def weak_against_data(self) -> Dict[str, Dict[str, List[str]]]:
        """Get the weak_against data."""
        if not self._weak_against_data:
            self.load_data()
        return self._weak_against_data

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

    def compute_team_stats(self, current_team: Dict[str, str], enemy_team: List[str]) -> Dict[str, Any]:
        """
        Compute team stats for current team against enemy team.

        Args:
            current_team: Dictionary mapping slot names to hero names
            enemy_team: List of enemy hero names

        Returns:
            Dictionary with team stats including counter and synergy scores
        """
        hero_data = self.data_provider.hero_data
        weak_against_data = self.data_provider.weak_against_data

        team_stats = {
            "total_counter_score": 0,
            "total_synergy_score": 0,
            "team": {}
        }

        # Filter out None values and normalize hero names
        current_heroes = {slot: normalize_hero_name(hero) for slot, hero in current_team.items() if hero}
        enemy_heroes = [normalize_hero_name(hero) for hero in enemy_team if hero]

        # Skip if either team is empty
        if not current_heroes or not enemy_heroes:
            return team_stats

        for slot, hero in current_heroes.items():
            if hero not in hero_data:
                continue  # Skip invalid heroes

            role = hero_data[hero]["role"]
            strong_against = []
            synergizes_with = []
            counter_score = 0
            synergy_score = 0

            # Calculate countering stats
            for enemy in enemy_heroes:
                if enemy in hero_data:
                    # Check if current hero is strong against this enemy
                    enemy_role = hero_data[enemy]["role"]
                    # Map the enemy role to the correct category in strong_against
                    enemy_category = enemy_role + "s" if enemy_role != "damage" else enemy_role

                    if "strong_against" in hero_data[hero] and enemy_category in hero_data[hero]["strong_against"]:
                        if enemy in hero_data[hero]["strong_against"][enemy_category]:
                            strong_against.append(enemy)
                            counter_score += 1  # +1 for each enemy countered

            # Calculate synergy stats
            if "synergizes_with" in hero_data[hero]:
                for category, allies in hero_data[hero]["synergizes_with"].items():
                    for ally in allies:
                        if ally in current_heroes.values():  # Check if ally is in the same team
                            synergizes_with.append(ally)
                            synergy_score += 0.5  # +0.5 for each synergy

            # Add stats to output
            team_stats["team"][slot] = {
                "hero": hero,
                "role": role,
                "strong_against": strong_against,
                "synergizes_with": synergizes_with,
                "counter_score": counter_score,
                "synergy_score": synergy_score
            }

            # Update total scores
            team_stats["total_counter_score"] += counter_score
            team_stats["total_synergy_score"] += synergy_score

        return team_stats

    def compute_enemy_stats(self, current_team: Dict[str, str], enemy_team: List[str]) -> Dict[str, Any]:
        """
        Compute stats for enemy team against current team.

        Args:
            current_team: Dictionary mapping slot names to hero names
            enemy_team: List of enemy hero names

        Returns:
            Dictionary with enemy team stats
        """
        hero_data = self.data_provider.hero_data
        weak_against_data = self.data_provider.weak_against_data

        enemy_stats = {
            "total_counter_score": 0,
            "team": {}
        }

        # Filter out None values and normalize hero names
        current_heroes = {slot: normalize_hero_name(hero) for slot, hero in current_team.items() if hero}
        enemy_heroes = [normalize_hero_name(hero) for hero in enemy_team if hero]

        # Skip if either team is empty
        if not current_heroes or not enemy_heroes:
            return enemy_stats

        for i, enemy in enumerate(enemy_heroes):
            if enemy not in hero_data:
                continue  # Skip invalid heroes

            role = hero_data[enemy]["role"]
            strong_against = []
            counter_score = 0

            # Calculate countering stats
            for _, ally in current_heroes.items():
                if ally in hero_data:
                    # Check if enemy is strong against this ally
                    ally_role = hero_data[ally]["role"]
                    # Map the ally role to the correct category in strong_against
                    ally_category = ally_role + "s" if ally_role != "damage" else ally_role

                    if "strong_against" in hero_data[enemy] and ally_category in hero_data[enemy]["strong_against"]:
                        if ally in hero_data[enemy]["strong_against"][ally_category]:
                            strong_against.append(ally)
                            counter_score += 1  # +1 for each ally countered

            # Add stats to output
            slot = f"enemy_{i+1}"
            enemy_stats["team"][slot] = {
                "hero": enemy,
                "role": role,
                "strong_against": strong_against,
                "counter_score": counter_score
            }

            # Update total score
            enemy_stats["total_counter_score"] += counter_score

        return enemy_stats


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
        synergy_bonus = suggestions.get('synergy_bonus', 0)
        result = f"\nTotal score: {total_score}"

        if synergy_bonus > 0:
            result += f" (includes {synergy_bonus:.1f} synergy bonus)"

        result += "\nSuggested counter picks:\n"

        counters = []
        for role, heroes in suggestions.items():
            if role not in ['total_score', 'synergy_bonus']:
                result += f"\n{role.upper()}:\n"
                for hero, score in heroes:
                    result += f"- {hero} (counters {score} enemies)\n"
                    counters.append(hero)

        team_summary = ", ".join(counters)
        result += f"\nSuggested team: {team_summary}"

        speech_text = f"Suggested counters: {team_summary}. Total effectiveness score: {total_score}"
        if synergy_bonus > 0:
            speech_text += f", including {synergy_bonus:.1f} points from hero synergies"

        return result, speech_text

    def format_team_stats(self, team_stats: Dict[str, Any]) -> str:
        """Format team stats for display."""
        result = f"\nTeam Stats:\n"
        result += f"Total Counter Score: {team_stats['total_counter_score']}\n"
        result += f"Total Synergy Score: {team_stats['total_synergy_score']}\n\n"

        for slot, stats in team_stats['team'].items():
            result += f"{slot.upper()} - {stats['hero']} ({stats['role']}):\n"
            result += f"  Strong Against: {', '.join(stats['strong_against'])}\n"
            result += f"  Synergizes With: {', '.join(stats['synergizes_with'])}\n"
            result += f"  Counter Score: {stats['counter_score']}\n"
            result += f"  Synergy Score: {stats['synergy_score']}\n\n"

        return result