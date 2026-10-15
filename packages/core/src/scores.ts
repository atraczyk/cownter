import type { HeroData, HeroScore, Role, RoleCategory, ScoreBlock, ScoreUpdate, TeamSlots } from './types';

function roleCategory(role: Role): RoleCategory {
  return role === 'damage' ? 'damage' : (`${role}s` as RoleCategory);
}

/**
 * Synergy partners within a lineup, in slot order.
 * A pair counts when the earlier hero lists the later one, and both are credited.
 */
export function synergyPartners(heroData: HeroData, heroes: readonly string[]): Record<string, string[]> {
  const partners: Record<string, string[]> = Object.fromEntries(heroes.map((hero) => [hero, [] as string[]]));
  for (let i = 0; i < heroes.length; i += 1) {
    const hero1 = heroes[i];
    const links = heroData[hero1]?.synergizes_with;
    if (!links) continue;
    for (let j = i + 1; j < heroes.length; j += 1) {
      const hero2 = heroes[j];
      const role = heroData[hero2]?.role;
      if (!role || !links[roleCategory(role)]?.includes(hero2)) continue;
      partners[hero1].push(hero2);
      partners[hero2].push(hero1);
    }
  }
  for (const hero of heroes) partners[hero].sort();
  return partners;
}

function emptyTeams(heroes: readonly (string | null)[]): boolean {
  return heroes.every((hero) => !hero);
}

function scoreSide(
  heroData: HeroData,
  attackers: readonly (string | null)[],
  defenders: readonly (string | null)[],
  fitBonus: Record<string, number>,
): ScoreBlock | null {
  const attackersFilled = attackers.filter((hero): hero is string => Boolean(hero));
  const defendersFilled = defenders.filter((hero): hero is string => Boolean(hero));
  if (attackersFilled.length === 0 || defendersFilled.length === 0) return null;

  const counterScores: Record<string, number> = {};
  const counteredHeroes: Record<string, string[]> = {};
  const synergizingHeroes = synergyPartners(heroData, attackersFilled);

  for (const hero of attackersFilled) {
    if (!heroData[hero]?.strong_against) continue;
    let score = 0;
    const countered: string[] = [];
    for (const enemy of defendersFilled) {
      if (!heroData[enemy]) continue;
      const category = roleCategory(heroData[enemy].role);
      if (heroData[hero].strong_against?.[category]?.includes(enemy)) {
        score += 1;
        countered.push(enemy);
      }
    }
    counterScores[hero] = score;
    counteredHeroes[hero] = countered;
  }

  const heroes: HeroScore[] = attackersFilled.map((hero) => {
    const counter = counterScores[hero] ?? 0;
    const partners = synergizingHeroes[hero] ?? [];
    const fit = fitBonus[hero] ?? 0;
    return [
      hero,
      Math.round((counter + partners.length * 0.5 + fit) * 10) / 10,
      [...(counteredHeroes[hero] ?? [])].sort(),
      partners,
    ];
  });

  return {
    total_score: Math.round(heroes.reduce((sum, [, score]) => sum + score, 0) * 10) / 10,
    heroes,
  };
}

/**
 * Score your team vs the enemy and the enemy vs your team (UI scoreboard).
 * Each hero scores counters + synergy + map fit; fit maps are per team because
 * on sided modes the enemy plays the other side.
 */
export function scoreTeams(
  heroData: HeroData,
  counter: TeamSlots,
  enemy: TeamSlots,
  counterFit: Record<string, number> = {},
  enemyFit: Record<string, number> = {},
): ScoreUpdate {
  if (emptyTeams(enemy)) {
    return { current_scores: null, enemy_scores: null };
  }
  return {
    current_scores: scoreSide(heroData, counter, enemy, counterFit),
    enemy_scores: scoreSide(heroData, enemy, counter, enemyFit),
  };
}

export function heroesWithRoles(heroData: HeroData): Record<string, { role: Role }> {
  return Object.fromEntries(Object.entries(heroData).map(([hero, info]) => [hero, { role: info.role }]));
}

export function validateRoleLock(heroData: HeroData, heroes: readonly string[], openQueue = false): string | null {
  if (heroes.length !== 1 && heroes.length !== 5) {
    return 'Please provide either 1 hero or a full team of 5 heroes';
  }
  if (heroes.length === 1 || openQueue) return null;

  for (const hero of heroes) {
    if (!heroData[hero]) return `Hero not found: ${hero}`;
  }

  const roles = heroes.map((hero) => heroData[hero].role);
  const tank = roles.filter((role) => role === 'tank').length;
  const damage = roles.filter((role) => role === 'damage').length;
  const support = roles.filter((role) => role === 'support').length;
  if (tank !== 1 || damage !== 2 || support !== 2) {
    return `Invalid team composition. Required: 1 tank, 2 damage, 2 support. Current: ${tank} tank, ${damage} damage, ${support} support`;
  }
  return null;
}
