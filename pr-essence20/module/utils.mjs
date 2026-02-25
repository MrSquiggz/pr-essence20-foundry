export function clampNumber(n, { min = -Infinity, max = Infinity } = {}) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

export function rankToDie(rank, rankDice) {
  const r = clampNumber(rank, { min: 0, max: rankDice.length - 1 });
  return rankDice[r] ?? null;
}

export function staircaseDice(rank, rankDice) {
  const r = clampNumber(rank, { min: 0, max: rankDice.length - 1 });
  const dice = [];
  for (let i = 1; i <= r; i++) {
    const d = rankDice[i];
    if (d) dice.push(`1${d}`);
  }
  return dice;
}

export function d20Expression({ edge = false, snag = false } = {}) {
  if (edge && snag) return "1d20";
  if (edge) return "2d20kh1";
  if (snag) return "2d20kl1";
  return "1d20";
}

export function groupSkillsByEssence(skills) {
  const groups = { strength: [], speed: [], smarts: [], social: [] };
  for (const [id, s] of Object.entries(skills)) groups[s.essence]?.push({ id, ...s });
  for (const k of Object.keys(groups)) groups[k].sort((a,b)=>a.label.localeCompare(b.label));
  return groups;
}
