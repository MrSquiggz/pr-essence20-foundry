export const PR20 = {
  essences: {
    strength: { label: "Strength" },
    speed:    { label: "Speed" },
    smarts:   { label: "Smarts" },
    social:   { label: "Social" }
  },

  // Skill rank dice progression (rank 0 = untrained; no bonus die)
  rankDice: [null, "d2", "d4", "d6", "d8", "d10", "d12"],

  armorTraining: {
    light:       { label: "Light",       morphedToughnessBonus: 1 },
    medium:      { label: "Medium",      morphedToughnessBonus: 2 },
    heavy:       { label: "Heavy",       morphedToughnessBonus: 4 },
    ultraHeavy:  { label: "Ultra-Heavy", morphedToughnessBonus: 6 }
  },

  skills: {
    // Strength
    athletics:    { label: "Athletics",    essence: "strength" },
    brawn:        { label: "Brawn",        essence: "strength" },
    intimidation: { label: "Intimidation", essence: "strength" },
    might:        { label: "Might",        essence: "strength" },
    conditioning: { label: "Conditioning", essence: "strength", noRoll: true, noSpec: true, maxRank: 6 },

    // Speed
    acrobatics:   { label: "Acrobatics",   essence: "speed" },
    driving:      { label: "Driving",      essence: "speed" },
    finesse:      { label: "Finesse",      essence: "speed" },
    infiltration: { label: "Infiltration", essence: "speed" },
    initiative:   { label: "Initiative",   essence: "speed" },
    targeting:    { label: "Targeting",    essence: "speed" },

    // Smarts
    alertness:    { label: "Alertness",    essence: "smarts" },
    culture:      { label: "Culture",      essence: "smarts" },
    science:      { label: "Science",      essence: "smarts" },
    survival:     { label: "Survival",     essence: "smarts" },
    technology:   { label: "Technology",   essence: "smarts" },

    // Social
    animalHandling:{ label: "Animal Handling", essence: "social" },
    deception:    { label: "Deception",    essence: "social" },
    performance:  { label: "Performance",  essence: "social" },
    persuasion:   { label: "Persuasion",   essence: "social" },
    streetwise:   { label: "Streetwise",   essence: "social" }
  },

  itemTypes: ["origin", "role", "perk", "gear", "weapon", "shield", "armor"],

  // Level 1 default essence pool (builder uses this for warnings only)
  creation: { essencePoints: 12 }
};
