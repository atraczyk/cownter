"""
Tests for map / comp-type fit and the versioned data sheets.
"""

import copy
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.core.comp_fit import (  # noqa: E402
    CompDataProvider,
    fit_bonus,
    fit_score,
    load_sheet,
    validate_default_sheets,
    validate_sheets,
)
from src.utils.utils import suggest_counter_team  # noqa: E402


ARCHETYPES = {
    'sheet': 'archetypes', 'version': '1.0.0', 'updated': '2026-01-01',
    'archetypes': {'dive': '', 'poke': '', 'brawl': ''},
    'heroes': {
        'winston': {'dive': 1.0, 'poke': 0.0, 'brawl': 0.0},
        'reinhardt': {'dive': 0.0, 'poke': 0.0, 'brawl': 1.0},
    },
}

MAPS = {
    'sheet': 'maps', 'version': '1.0.0', 'updated': '2026-01-01',
    'modes': [
        {'id': 'control', 'name': 'Control', 'sided': False},
        {'id': 'escort', 'name': 'Escort', 'sided': True},
    ],
    'maps': [
        {'id': 'ilios', 'name': 'Ilios', 'mode': 'control', 'points': [
            {'id': 'well', 'name': 'Well', 'comp': {'dive': 0.6, 'poke': 0.3, 'brawl': 0.1}},
        ]},
        {'id': 'dorado', 'name': 'Dorado', 'mode': 'escort', 'points': [
            {'id': 'checkpoint_1', 'name': 'First checkpoint', 'comp': {
                'attack': {'dive': 0.1, 'poke': 0.2, 'brawl': 0.7},
                'defense': {'dive': 0.2, 'poke': 0.6, 'brawl': 0.2},
            }},
        ]},
    ],
}

HERO_DATA = {
    'winston': {'role': 'tank', 'strong_against': {}},
    'reinhardt': {'role': 'tank', 'strong_against': {}},
}


class TestFitMath(unittest.TestCase):
    """Fit score and bonus arithmetic."""

    def test_fit_score_is_weighted_overlap(self):
        self.assertAlmostEqual(fit_score({'dive': 1, 'poke': 0, 'brawl': 0}, {'dive': 0.6, 'poke': 0.3, 'brawl': 0.1}), 0.6)

    def test_bonus_rewards_matching_and_penalizes_mismatched_heroes(self):
        dive_point = {'dive': 0.6, 'poke': 0.3, 'brawl': 0.1}
        self.assertGreater(fit_bonus(ARCHETYPES['heroes']['winston'], dive_point), 0)
        self.assertLess(fit_bonus(ARCHETYPES['heroes']['reinhardt'], dive_point), 0)

    def test_neutral_preference_gives_no_bonus(self):
        third = 1 / 3
        self.assertEqual(fit_bonus({'dive': 1, 'poke': 0, 'brawl': 0}, {'dive': third, 'poke': third, 'brawl': third}), 0)


class TestCompDataProvider(unittest.TestCase):
    """Point preference lookup for sided and unsided modes."""

    def setUp(self):
        self.provider = CompDataProvider(copy.deepcopy(ARCHETYPES), copy.deepcopy(MAPS))

    def test_unsided_point_ignores_side(self):
        self.assertEqual(self.provider.point_preference('ilios', 'well', 'attack')['dive'], 0.6)

    def test_sided_point_needs_a_side(self):
        self.assertIsNone(self.provider.point_preference('dorado', 'checkpoint_1'))
        self.assertEqual(self.provider.point_preference('dorado', 'checkpoint_1', 'attack')['brawl'], 0.7)
        self.assertEqual(self.provider.point_preference('dorado', 'checkpoint_1', 'defense')['poke'], 0.6)

    def test_unknown_context_has_no_preference_or_bonus(self):
        self.assertIsNone(self.provider.point_preference('nowhere', 'well'))
        self.assertIsNone(self.provider.point_preference('ilios', 'nowhere'))
        self.assertEqual(self.provider.fit_bonuses(None), {})


class TestValidation(unittest.TestCase):
    """Schema checks used by tools/validate_data.py."""

    def test_shipped_sheets_are_valid(self):
        self.assertEqual(validate_default_sheets(), [])

    def test_shipped_sheets_are_versioned(self):
        for name in ('archetypes', 'maps'):
            sheet = load_sheet(name)
            self.assertRegex(sheet['version'], r'^\d+\.\d+\.\d+$')

    def test_valid_fixture_passes(self):
        self.assertEqual(validate_sheets(ARCHETYPES, MAPS, HERO_DATA), [])

    def test_reports_bad_weights_missing_heroes_and_missing_sides(self):
        archetypes = copy.deepcopy(ARCHETYPES)
        archetypes['heroes']['winston'] = {'dive': 0.9, 'poke': 0.9, 'brawl': 0.0}
        del archetypes['heroes']['reinhardt']
        maps = copy.deepcopy(MAPS)
        maps['maps'][1]['points'][0]['comp'] = {'dive': 0.2, 'poke': 0.4, 'brawl': 0.4}
        maps['version'] = 'v1'

        errors = validate_sheets(archetypes, maps, HERO_DATA)
        self.assertTrue(any('winston' in e and 'sum' in e for e in errors))
        self.assertTrue(any('missing hero "reinhardt"' in e for e in errors))
        self.assertTrue(any('attack' in e and 'defense' in e for e in errors))
        self.assertTrue(any('semver' in e for e in errors))


class TestMapWeightedSuggestions(unittest.TestCase):
    """Map fit changes which heroes are suggested."""

    def setUp(self):
        self.hero_data = {
            'winston': {'role': 'tank', 'strong_against': {'damage': ['widowmaker']}},
            'reinhardt': {'role': 'tank', 'strong_against': {'damage': ['widowmaker']}},
            'widowmaker': {'role': 'damage', 'strong_against': {}},
        }

    def test_without_fit_result_has_no_map_fit(self):
        result = suggest_counter_team(self.hero_data, ['widowmaker'])
        self.assertNotIn('map_fit', result)

    def test_fit_bonus_breaks_ties_toward_the_map(self):
        dive = suggest_counter_team(self.hero_data, ['widowmaker'], {'winston': 0.8, 'reinhardt': -0.4})
        brawl = suggest_counter_team(self.hero_data, ['widowmaker'], {'winston': -0.4, 'reinhardt': 0.8})
        self.assertEqual(dive['tank'][0][0], 'winston')
        self.assertEqual(brawl['tank'][0][0], 'reinhardt')
        self.assertEqual(dive['map_fit']['winston'], 0.8)


if __name__ == '__main__':
    unittest.main()
