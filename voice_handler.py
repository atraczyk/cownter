"""
Module for handling voice input for team composition in Overwatch 2.
"""

from typing import Optional, List, Dict, Any
from speech_handler import SpeechHandler
from utils import normalize_hero_name, get_closest_match

class TeamVoiceHandler:
    """Handles voice input for team composition."""

    def __init__(self, hero_data: Dict[str, Any], speech_handler: SpeechHandler):
        """
        Initialize the team voice handler.

        Args:
            hero_data: Dictionary containing hero information
            speech_handler: SpeechHandler instance for voice I/O
        """
        self.hero_data = hero_data
        self.speech_handler = speech_handler

    def _validate_hero(self, text: str) -> List[str]:
        """
        Validate and normalize hero names from voice input.

        Args:
            text: Voice input text

        Returns:
            List of validated hero names
        """
        if not text:
            return []

        potential_heroes = text.split()
        validated_heroes = []

        for hero in potential_heroes:
            closest_match = get_closest_match(hero, self.hero_data.keys())
            print(f"Heard '{hero}', matched to '{closest_match}'")
            validated_heroes.append(closest_match)

        return validated_heroes

    def _check_composition(self, heroes: List[str]) -> bool:
        """
        Check if the team composition is valid and speak the result.

        Args:
            heroes: List of hero names to validate

        Returns:
            bool: True if composition is valid
        """
        # Count roles
        roles = [self.hero_data[h]['role'] for h in heroes]
        tank_count = roles.count('tank')
        damage_count = roles.count('damage')
        support_count = roles.count('support')

        # Validate 1-2-2 composition
        if tank_count != 1 or damage_count != 2 or support_count != 2:
            error_msg = (f"Error: invalid team composition. Got "
                        f"{tank_count} tank, {damage_count} damage, {support_count} support. "
                        f"Required: 1 tank, 2 damage, 2 support")
            self.speech_handler.speak(error_msg)
            return False
        return True

    def _get_speech_confirmation(self, prompt: str) -> bool:
        """
        Get yes/no confirmation via speech.

        Args:
            prompt: Question to ask

        Returns:
            bool: True for yes, False for no
        """
        self.speech_handler.speak(prompt)
        for _ in range(2):  # Give 2 attempts to get clear yes/no
            result = self.speech_handler.listen_for_item(timeout=3, play_sounds=False)
            if result:
                if 'yes' in result.lower() or 'yeah' in result.lower() or 'sure' in result.lower():
                    self.speech_handler.play_sound(True)
                    return True
                if 'no' in result.lower() or 'nope' in result.lower():
                    self.speech_handler.play_sound(True)
                    return False
            self.speech_handler.play_sound(False)
        return False  # Default to no if unclear

    def get_speech_confirmation(self, prompt: str) -> bool:
        """
        Public method to get yes/no confirmation via speech.

        Args:
            prompt: Question to ask

        Returns:
            bool: True for yes, False for no
        """
        return self._get_speech_confirmation(prompt)

    def get_team(self) -> Optional[List[str]]:
        """
        Get team composition using voice input.

        Returns:
            Optional[List[str]]: List of 5 hero names if successful, None otherwise
        """
        heroes = []
        while len(heroes) < 5:
            result = self.speech_handler.listen_for_item(
                prompt="List the enemy heroes" if not heroes else None,
                timeout=3,
                retries=2
            )

            if not result:
                if self.get_speech_confirmation("Would you like to try again?"):
                    heroes = []
                    continue
                return None

            new_heroes = self._validate_hero(result)
            if new_heroes:
                # Add heroes until we have 5
                for hero in new_heroes:
                    if len(heroes) < 5:
                        heroes.append(hero)
                        print(f"Hero {len(heroes)}/5: {hero}")
                    else:
                        print(f"Ignoring extra hero: {hero}")

                # Check composition if we have 5 heroes
                if len(heroes) == 5:
                    if not self._check_composition(heroes):
                        heroes = []  # Reset and start over
                        continue
                elif len(heroes) < 5:
                    print("Say next hero...")
            else:
                self.speech_handler.play_sound(False)
                continue

        print("\nUsing team: " + ", ".join(heroes))
        return heroes