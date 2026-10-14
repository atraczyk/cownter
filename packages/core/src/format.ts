import type { Suggestions } from './types';

export function formatHeroCounters(
  hero: string,
  counters: Partial<Record<'tanks' | 'damage' | 'support', string[]>>,
  role: string,
): string {
  return [
    `\nCounters for ${hero} (${role}):`,
    `\tTank\t: ${(counters.tanks ?? []).join(', ')}`,
    `\tDamage\t: ${(counters.damage ?? []).join(', ')}`,
    `\tSupport\t: ${(counters.support ?? []).join(', ')}`,
  ].join('\n');
}

export function formatCounterSuggestions(suggestions: Suggestions): string {
  const synergy = suggestions.synergy_bonus ?? 0;
  let result = `\nTotal score: ${suggestions.total_score ?? 0}`;
  if (synergy > 0) result += ` (includes ${synergy.toFixed(1)} synergy bonus)`;
  result += '\nSuggested counter picks:\n';

  const picks: string[] = [];
  for (const role of ['tank', 'damage', 'support'] as const) {
    const heroes = suggestions[role] ?? [];
    if (!heroes.length) continue;
    result += `\n${role.toUpperCase()}:\n`;
    for (const [hero, score] of heroes) {
      result += `- ${hero} (counters ${score} enemies)\n`;
      picks.push(hero);
    }
  }

  result += `\nSuggested team: ${picks.join(', ')}`;
  return result;
}
