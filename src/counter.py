"""
Command-line interface for Overwatch 2 counter picker.
Uses hero_data.json for hero counter relationships and team composition analysis.
"""

import logging
import argparse

from src.web import server
from src.core.counter_analyzer import (
    HeroDataProvider,
    TeamValidator,
    CounterAnalyzer,
    CounterResultFormatter
)
from src.utils.utils import normalize_hero_name

# Allow non-top-level imports
# pylint: disable=import-outside-toplevel

logging.basicConfig(level=logging.INFO)

def main():
    """Main function to execute the counter data analysis."""
    parser = argparse.ArgumentParser()
    parser.add_argument('--list-heroes', action='store_true', help='List all available heroes')
    parser.add_argument('--heroes', help='Comma-separated list of 1 or 5 heroes to check counters for')
    parser.add_argument('--open', action='store_true', help='Allow non-role-lock team compositions')
    parser.add_argument('--listen', action='store_true', help='Listen for voice input of enemy team composition')
    parser.add_argument('--serve', action='store_true', help='Start web interface')
    parser.add_argument('--port', type=int, default=5000, help='Port for web interface')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode for web interface')
    parser.add_argument('--stats', action='store_true', help='Show detailed team stats including synergies')
    args = parser.parse_args()

    # Initialize our classes
    data_provider = HeroDataProvider()
    if not data_provider.load_data():
        logging.error("Failed to load hero data. Exiting.")
        return

    team_validator = TeamValidator(data_provider)
    counter_analyzer = CounterAnalyzer(data_provider)
    formatter = CounterResultFormatter()

    if args.serve:
        print(f"Starting web interface on port {args.port}")
        server.start(port=args.port, debug=args.debug)
        return

    if args.list_heroes:
        heroes = data_provider.get_hero_list()
        print("\nAvailable Heroes (normalized):")
        for hero in heroes:
            print("- " + hero)
        print("\nTotal heroes: " + str(len(heroes)))
        return

    if args.heroes:
        # Parse and match hero names
        hero_list = [h.strip() for h in args.heroes.split(',')]
        hero_list = team_validator.match_hero_names(hero_list)

        print("Using team: " + ", ".join(hero_list))

        if not team_validator.validate_team(hero_list, args.open):
            return

        if len(hero_list) == 1:
            # Show counters for a single hero
            hero = hero_list[0]
            counters = counter_analyzer.show_hero_counters(hero)
            if counters:
                role = data_provider.get_hero_role(normalize_hero_name(hero))
                print(formatter.format_hero_counters(hero, counters, role))
        elif len(hero_list) == 5:
            # Suggest counters for a team
            normalized_heroes = team_validator.normalize_team(hero_list)
            suggestions = counter_analyzer.suggest_counters(normalized_heroes)
            result, _ = formatter.format_counter_suggestions(suggestions)
            print(result)

            # Show detailed team stats if requested
            if args.stats:
                # Convert team to dictionary format for compute_team_stats
                current_team = {}
                for i, hero in enumerate(normalized_heroes):
                    if i == 0:
                        slot_name = "tank_1"
                    elif i == 1 or i == 2:
                        slot_name = f"damage_{i}"
                    else:
                        slot_name = f"support_{i-2}"
                    current_team[slot_name] = hero

                # Create a sample counter team from suggestions
                counter_team = []
                for role, heroes in suggestions.items():
                    if role not in ['total_score', 'synergy_bonus']:
                        for hero, _ in heroes:
                            counter_team.append(hero)

                # Calculate and display team stats
                team_stats = counter_analyzer.compute_team_stats(current_team, counter_team)
                print("\nDetailed Team Stats:")
                print(formatter.format_team_stats(team_stats))

                # Calculate and display enemy stats
                enemy_stats = counter_analyzer.compute_enemy_stats(current_team, counter_team)
                print("\nEnemy Team Stats:")
                print(f"Total Counter Score: {enemy_stats['total_counter_score']}\n")
                for slot, stats in enemy_stats['team'].items():
                    print(f"{slot.upper()} - {stats['hero']} ({stats['role']}):")
                    print(f"  Strong Against: {', '.join(stats['strong_against'])}")
                    print(f"  Counter Score: {stats['counter_score']}\n")
        return

    if not (args.list_heroes or args.heroes) or args.listen:
        from src.voice.speech_handler import SpeechHandler
        from src.voice.voice_handler import TeamVoiceHandler
        speech_handler = SpeechHandler()
        voice_handler = TeamVoiceHandler(data_provider.hero_data, speech_handler)

        while True:
            heroes = voice_handler.get_team()
            if not heroes:
                if not voice_handler.get_speech_confirmation("Would you like to try again?"):
                    return
                continue

            if team_validator.validate_team(heroes, args.open):
                normalized_heroes = team_validator.normalize_team(heroes)
                suggestions = counter_analyzer.suggest_counters(normalized_heroes)
                _, speech_text = formatter.format_counter_suggestions(suggestions)
                print(speech_text)
                speech_handler.speak(speech_text)

                if voice_handler.get_speech_confirmation("Would you like to check another team?"):
                    continue
                return

    if not any([args.list_heroes, args.heroes, args.listen]):
        counter_matrix = counter_analyzer.create_counter_matrix()
        print("\nCounter Matrix:")
        print(counter_matrix)

if __name__ == "__main__":
    main()