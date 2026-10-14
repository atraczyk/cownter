"""Map and comp-type (dive / poke / brawl) fit for hero suggestions."""

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

ARCHETYPES = ('dive', 'poke', 'brawl')
SIDES = ('attack', 'defense')
DATA_DIR = Path(__file__).resolve().parent / 'data'
HERO_DATA_PATH = Path(__file__).resolve().parent / 'hero_data.json'

# How many points a perfect comp match is worth relative to a neutral pick.
# A counter is worth 1 point, so a full-fit hero gains about 2 points.
FIT_WEIGHT = 3.0
WEIGHT_TOLERANCE = 0.011
SEMVER = re.compile(r'^\d+\.\d+\.\d+$')


def load_sheet(name: str, data_dir: Path = DATA_DIR) -> Dict[str, Any]:
    """Load a versioned data sheet by name."""
    with open(data_dir / f'{name}.json', encoding='utf-8') as handle:
        return json.load(handle)


def fit_score(hero_weights: Dict[str, float], preference: Dict[str, float]) -> float:
    """How well a hero matches a comp preference, from 0 (no overlap) to 1."""
    return sum(hero_weights.get(a, 0.0) * preference.get(a, 0.0) for a in ARCHETYPES)


def fit_bonus(hero_weights: Dict[str, float], preference: Dict[str, float]) -> float:
    """Score adjustment for a hero on a map point; negative for poor fits."""
    neutral = 1.0 / len(ARCHETYPES)
    return round(FIT_WEIGHT * (fit_score(hero_weights, preference) - neutral), 2)


class CompDataProvider:
    """Hero archetypes and map preferences loaded from the versioned data sheets."""

    def __init__(self, archetypes: Optional[Dict[str, Any]] = None, maps: Optional[Dict[str, Any]] = None):
        self.archetypes = archetypes if archetypes is not None else load_sheet('archetypes')
        self.maps = maps if maps is not None else load_sheet('maps')
        self._modes = {mode['id']: mode for mode in self.maps['modes']}
        self._maps = {entry['id']: entry for entry in self.maps['maps']}

    @property
    def hero_weights(self) -> Dict[str, Dict[str, float]]:
        return self.archetypes['heroes']

    def is_sided(self, map_id: str) -> bool:
        entry = self._maps.get(map_id)
        return bool(entry and self._modes.get(entry['mode'], {}).get('sided'))

    def point_preference(
        self, map_id: Optional[str], point_id: Optional[str], side: Optional[str] = None
    ) -> Optional[Dict[str, float]]:
        """Comp preference for a map point, or None if the context is incomplete."""
        entry = self._maps.get(map_id or '')
        if not entry:
            return None
        point = next((p for p in entry['points'] if p['id'] == point_id), None)
        if not point:
            return None
        comp = point['comp']
        if self.is_sided(entry['id']):
            return comp.get(side or '') if side in SIDES else None
        return comp

    def fit_bonuses(self, preference: Optional[Dict[str, float]]) -> Dict[str, float]:
        """Fit bonus for every hero against a preference; empty when there is none."""
        if not preference:
            return {}
        return {hero: fit_bonus(weights, preference) for hero, weights in self.hero_weights.items()}

    def client_payload(self) -> Dict[str, Any]:
        """Everything the UI needs to render modes, maps and hero leanings."""
        return {
            'archetypes': {
                'version': self.archetypes['version'],
                'status': self.archetypes.get('status'),
                'descriptions': self.archetypes['archetypes'],
                'heroes': self.hero_weights,
            },
            'maps': {
                'version': self.maps['version'],
                'status': self.maps.get('status'),
                'modes': self.maps['modes'],
                'maps': self.maps['maps'],
            },
        }


def _check_weights(label: str, weights: Any, errors: List[str]) -> None:
    if not isinstance(weights, dict) or set(weights) != set(ARCHETYPES):
        errors.append(f'{label}: needs exactly {", ".join(ARCHETYPES)}')
        return
    for archetype, value in weights.items():
        if not isinstance(value, (int, float)) or not 0 <= value <= 1:
            errors.append(f'{label}: {archetype} must be between 0 and 1, got {value!r}')
            return
    total = sum(weights.values())
    if abs(total - 1) > WEIGHT_TOLERANCE:
        errors.append(f'{label}: weights sum to {total:.2f}, expected 1')


def _check_header(name: str, sheet: Dict[str, Any], errors: List[str]) -> None:
    if sheet.get('sheet') != name:
        errors.append(f'{name}: "sheet" must be "{name}"')
    if not SEMVER.match(str(sheet.get('version', ''))):
        errors.append(f'{name}: "version" must be semver like 1.2.3')
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', str(sheet.get('updated', ''))):
        errors.append(f'{name}: "updated" must be a YYYY-MM-DD date')


def validate_sheets(
    archetypes: Dict[str, Any], maps: Dict[str, Any], hero_data: Dict[str, Any]
) -> List[str]:
    """Return every problem found across the data sheets; empty means valid."""
    errors: List[str] = []
    _check_header('archetypes', archetypes, errors)
    _check_header('maps', maps, errors)

    hero_weights = archetypes.get('heroes', {})
    for hero in sorted(set(hero_data) - set(hero_weights)):
        errors.append(f'archetypes: missing hero "{hero}" from hero_data.json')
    for hero in sorted(set(hero_weights) - set(hero_data)):
        errors.append(f'archetypes: "{hero}" is not in hero_data.json')
    for hero, weights in hero_weights.items():
        _check_weights(f'archetypes.{hero}', weights, errors)

    modes = {mode.get('id'): mode for mode in maps.get('modes', [])}
    seen_maps = set()
    for entry in maps.get('maps', []):
        map_id = entry.get('id')
        if map_id in seen_maps:
            errors.append(f'maps: duplicate map id "{map_id}"')
        seen_maps.add(map_id)

        mode = modes.get(entry.get('mode'))
        if not mode:
            errors.append(f'maps.{map_id}: unknown mode "{entry.get("mode")}"')
            continue

        points = entry.get('points', [])
        if not points:
            errors.append(f'maps.{map_id}: needs at least one point')
        seen_points = set()
        for point in points:
            point_id = point.get('id')
            label = f'maps.{map_id}.{point_id}'
            if point_id in seen_points:
                errors.append(f'{label}: duplicate point id')
            seen_points.add(point_id)

            comp = point.get('comp')
            if mode.get('sided'):
                if not isinstance(comp, dict) or set(comp) != set(SIDES):
                    errors.append(f'{label}: sided modes need "attack" and "defense" preferences')
                    continue
                for side in SIDES:
                    _check_weights(f'{label}.{side}', comp[side], errors)
            else:
                _check_weights(label, comp, errors)

    return errors


def validate_default_sheets() -> List[str]:
    """Validate the sheets shipped in src/core/data against hero_data.json."""
    with open(HERO_DATA_PATH, encoding='utf-8') as handle:
        hero_data = json.load(handle)
    return validate_sheets(load_sheet('archetypes'), load_sheet('maps'), hero_data)
