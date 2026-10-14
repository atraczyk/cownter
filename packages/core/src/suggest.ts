import type { HeroData, HeroScore, Role, RoleCategory, Suggestions } from './types';

type Candidate = [string, number, string[]];

function roleCategory(role: Role): RoleCategory {
  return role === 'damage' ? 'damage' : (`${role}s` as RoleCategory);
}

function countersEnemy(heroData: HeroData, hero: string, enemy: string): boolean {
  const enemyRole = heroData[enemy]?.role;
  if (!enemyRole) return false;
  const category = roleCategory(enemyRole);
  return Boolean(heroData[hero]?.strong_against?.[category]?.includes(enemy));
}

function synergizes(heroData: HeroData, hero1: string, hero2: string): boolean {
  const role2 = heroData[hero2]?.role;
  if (!role2) return false;
  return Boolean(heroData[hero1]?.synergizes_with?.[roleCategory(role2)]?.includes(hero2));
}

/** Suggest an optimal counter team, optionally weighted by map fit. */
export function suggestCounterTeam(
  heroData: HeroData,
  enemyTeam: readonly string[],
  fitBonus: Record<string, number> = {},
): Suggestions {
  const counterScores: Record<string, number> = {};
  const counteredHeroes: Record<string, string[]> = {};

  for (const hero of Object.keys(heroData)) {
    if (!heroData[hero].strong_against) continue;
    let score = 0;
    const countered: string[] = [];
    for (const enemy of enemyTeam) {
      if (!heroData[enemy]) continue;
      if (countersEnemy(heroData, hero, enemy)) {
        score += 1;
        countered.push(enemy);
      }
    }
    if (score > 0 || (fitBonus[hero] ?? 0) > 0) {
      counterScores[hero] = score;
      counteredHeroes[hero] = countered;
    }
  }

  const roleHeroes: Record<Role, Candidate[]> = { tank: [], damage: [], support: [] };
  for (const [hero, score] of Object.entries(counterScores)) {
    const role = heroData[hero]?.role;
    if (role) roleHeroes[role].push([hero, score, counteredHeroes[hero]]);
  }

  const ranked = (entry: Candidate) => entry[1] + (fitBonus[entry[0]] ?? 0);
  (Object.keys(roleHeroes) as Role[]).forEach((role) => {
    roleHeroes[role].sort((a, b) => ranked(b) - ranked(a));
  });

  const top = {
    tank: roleHeroes.tank.slice(0, 3),
    damage: roleHeroes.damage.slice(0, 5),
    support: roleHeroes.support.slice(0, 5),
  };

  let bestScore = 0;
  let bestTeam: Record<Role, Candidate[]> = { tank: [], damage: [], support: [] };

  for (const [tank, tankScore, tankCountered] of top.tank) {
    for (let i = 0; i < top.damage.length; i += 1) {
      const [damage1, damage1Score, damage1Countered] = top.damage[i];
      for (let j = i + 1; j < top.damage.length; j += 1) {
        const [damage2, damage2Score, damage2Countered] = top.damage[j];
        for (let k = 0; k < top.support.length; k += 1) {
          const [support1, support1Score, support1Countered] = top.support[k];
          for (let l = k + 1; l < top.support.length; l += 1) {
            const [support2, support2Score, support2Countered] = top.support[l];
            const team = [tank, damage1, damage2, support1, support2];
            let counterScore =
              tankScore + damage1Score + damage2Score + support1Score + support2Score;
            counterScore += team.reduce((sum, hero) => sum + (fitBonus[hero] ?? 0), 0);

            let synergyScore = 0;
            for (let a = 0; a < team.length; a += 1) {
              for (let b = a + 1; b < team.length; b += 1) {
                if (synergizes(heroData, team[a], team[b])) synergyScore += 0.5;
              }
            }

            const totalScore = counterScore + synergyScore;
            if (totalScore > bestScore) {
              bestScore = totalScore;
              bestTeam = {
                tank: [[tank, tankScore, tankCountered]],
                damage: [
                  [damage1, damage1Score, damage1Countered],
                  [damage2, damage2Score, damage2Countered],
                ],
                support: [
                  [support1, support1Score, support1Countered],
                  [support2, support2Score, support2Countered],
                ],
              };
            }
          }
        }
      }
    }
  }

  let result: Suggestions;
  if (bestScore === 0) {
    result = {
      total_score:
        (roleHeroes.tank[0]?.[1] ?? 0) +
        (roleHeroes.damage[0]?.[1] ?? 0) +
        (roleHeroes.damage[1]?.[1] ?? 0) +
        (roleHeroes.support[0]?.[1] ?? 0) +
        (roleHeroes.support[1]?.[1] ?? 0),
      tank: roleHeroes.tank.slice(0, 1),
      damage: roleHeroes.damage.slice(0, 2),
      support: roleHeroes.support.slice(0, 2),
    };
  } else {
    const pickedFit = (['tank', 'damage', 'support'] as Role[]).reduce(
      (sum, role) => sum + bestTeam[role].reduce((roleSum, [hero]) => roleSum + (fitBonus[hero] ?? 0), 0),
      0,
    );
    const baseCounters = (['tank', 'damage', 'support'] as Role[]).reduce(
      (sum, role) => sum + bestTeam[role].reduce((roleSum, [, score]) => roleSum + score, 0),
      0,
    );
    result = {
      total_score: bestScore,
      synergy_bonus: bestScore - pickedFit - baseCounters,
      tank: bestTeam.tank,
      damage: bestTeam.damage,
      support: bestTeam.support,
    };
  }

  if (Object.keys(fitBonus).length > 0) {
    result.map_fit = Object.fromEntries(
      (['tank', 'damage', 'support'] as Role[]).flatMap((role) =>
        (result[role] ?? []).map(([hero]) => [hero, fitBonus[hero] ?? 0]),
      ),
    );
  }

  return enrichSuggestionSynergies(heroData, result);
}

/** Add cross-role synergy partners among the suggested picks (matches the old Flask response). */
export function enrichSuggestionSynergies(heroData: HeroData, suggestions: Suggestions): Suggestions {
  const roles: Role[] = ['tank', 'damage', 'support'];
  const next: Suggestions = { ...suggestions };

  for (const role of roles) {
    const heroes = suggestions[role];
    if (!Array.isArray(heroes)) continue;
    next[role] = heroes.map((entry) => {
      const [hero, score, countered = []] = entry;
      const synergizesWith = new Set<string>(entry[3] ?? []);
      for (const otherRole of roles) {
        if (otherRole === role) continue;
        for (const other of suggestions[otherRole] ?? []) {
          const otherHero = other[0];
          if (otherHero !== hero && synergizes(heroData, hero, otherHero)) {
            synergizesWith.add(otherHero);
          }
        }
      }
      return [hero, score, countered, [...synergizesWith].sort()] as HeroScore;
    });
  }

  return next;
}

export function showHeroCounters(heroData: HeroData, hero: string) {
  return heroData[hero]?.strong_against ?? {};
}
