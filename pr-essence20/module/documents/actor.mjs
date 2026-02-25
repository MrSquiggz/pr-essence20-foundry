import { PR20 } from "../config.mjs";
import { clampNumber, staircaseDice, d20Expression, rankToDie } from "../utils.mjs";

export class PR20Actor extends Actor {
  prepareBaseData() {
    super.prepareBaseData();

    this.system.details ??= {};
    this.system.details.level ??= 1;
    this.system.details.role ??= "";
    this.system.details.origin ??= "";
    this.system.details.pronouns ??= "";
    this.system.details.description ??= "";
    this.system.details.languages ??= "";
    this.system.details.influences ??= "";
    this.system.details.hangups ??= "";
    this.system.details.notes ??= "";

    this.system.toggles ??= {};
    this.system.toggles.morphed ??= false;

    this.system.essences ??= {};
    for (const [k, meta] of Object.entries(PR20.essences)) {
      this.system.essences[k] ??= { value: 1, label: meta.label };
      this.system.essences[k].label ??= meta.label;
      this.system.essences[k].value ??= 1;
    }

    this.system.skills ??= {};
    for (const [k, meta] of Object.entries(PR20.skills)) {
      this.system.skills[k] ??= {};
      const s = this.system.skills[k];
      s.label ??= meta.label;
      s.essence ??= meta.essence;
      s.rank ??= 0;
      s.specialized ??= false;
      s.specialization ??= "";
      s.notes ??= "";
    }

    this.system.resources ??= {};
    this.system.resources.health ??= { value: 0, base: 0, max: 0 };
    this.system.resources.personalPower ??= { value: 0, max: 0 };
    this.system.resources.movement ??= { value: 30 };

    this.system.armor ??= {};
    this.system.armor.training ??= "light";
    this.system.armor.bonusToughness ??= 0;

    this.system.defenses ??= {};
    for (const k of ["toughness","evasion","willpower","cleverness"]) {
      this.system.defenses[k] ??= { base: 10, total: 10 };
      this.system.defenses[k].base ??= 10;
      this.system.defenses[k].total ??= 10;
    }
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    const str = clampNumber(this.system.essences?.strength?.value ?? 0, { min: 0 });
    const spd = clampNumber(this.system.essences?.speed?.value ?? 0, { min: 0 });
    const sma = clampNumber(this.system.essences?.smarts?.value ?? 0, { min: 0 });
    const soc = clampNumber(this.system.essences?.social?.value ?? 0, { min: 0 });

    this.system.defenses.toughness.base   = 10 + str;
    this.system.defenses.evasion.base    = 10 + spd;
    this.system.defenses.willpower.base  = 10 + sma;
    this.system.defenses.cleverness.base = 10 + soc;

    const armorBonus = clampNumber(this.system.armor?.bonusToughness ?? 0, { min: 0 });
    const trainingKey = this.system.armor?.training ?? "light";
    const training = PR20.armorTraining[trainingKey] ?? PR20.armorTraining.light;
    const morphed = !!this.system.toggles?.morphed;
    const morphedBonus = morphed ? (training?.morphedToughnessBonus ?? 0) : 0;

    this.system.defenses.toughness.total = this.system.defenses.toughness.base + armorBonus + morphedBonus;
    this.system.defenses.evasion.total    = this.system.defenses.evasion.base;
    this.system.defenses.willpower.total  = this.system.defenses.willpower.base;
    this.system.defenses.cleverness.total = this.system.defenses.cleverness.base;

    const cond = clampNumber(this.system.skills?.conditioning?.rank ?? 0, { min: 0, max: 6 });
    const base = clampNumber(this.system.resources?.health?.base ?? 0, { min: 0 });
    const maxHp = base + cond;
    this.system.resources.health.max = maxHp;
    if (this.system.resources.health.value > maxHp) this.system.resources.health.value = maxHp;
  }

  async rollSkill(skillId, { edge = false, snag = false, bonus = 0, forceSpecialized = null } = {}) {
    const meta = PR20.skills[skillId];
    const skill = this.system.skills?.[skillId];
    if (!meta || !skill) {
      ui.notifications?.warn(`Unknown skill: ${skillId}`);
      return null;
    }
    if (meta.noRoll) {
      ui.notifications?.info(`${meta.label} isn't rolled as a normal skill check.`);
      return null;
    }

    const essenceKey = meta.essence;
    const essence = clampNumber(this.system.essences?.[essenceKey]?.value ?? 0, { min: 0 });
    const rank = clampNumber(skill.rank ?? 0, { min: 0, max: PR20.rankDice.length - 1 });

    // Untrained automatically applies a snag (option B: we warn, we don't block)
    const autoSnag = (rank === 0);
    const finalSnag = snag || autoSnag;

    const d20Roll = await (new Roll(d20Expression({ edge, snag: finalSnag }))).evaluate({ async: true });
    const d20Total = d20Roll.total ?? 0;

    const specializedDefault = !!skill.specialized && !meta.noSpec && rank > 0;
    const specialized = (forceSpecialized === null) ? specializedDefault : !!forceSpecialized;

    let skillResults = [];
    if (specialized) {
      const dice = staircaseDice(rank, PR20.rankDice); // ["1d2","1d4",...]
      for (const f of dice) {
        const r = await (new Roll(f)).evaluate({ async: true });
        skillResults.push({ formula: f, total: r.total ?? 0 });
      }
    } else {
      const die = rankToDie(rank, PR20.rankDice);
      if (die) {
        const f = `1${die}`;
        const r = await (new Roll(f)).evaluate({ async: true });
        skillResults.push({ formula: f, total: r.total ?? 0 });
      }
    }

    const maxSkill = skillResults.length ? Math.max(...skillResults.map(r => r.total)) : 0;
    const total = d20Total + essence + maxSkill + clampNumber(bonus, { min: -999, max: 999 });

    const specTag = specialized ? (skill.specialization ? ` — ${skill.specialization}` : " — Specialized") : "";
    const note = autoSnag && !(edge && snag) ? "<br><em>Untrained: Snag applied automatically.</em>" : "";

    const diceLine = skillResults.length
      ? skillResults.map(r => `${r.formula}=${r.total}`).join(", ")
      : "—";

    const content = `
      <div>
        <strong>${this.name}</strong>: ${meta.label}${specTag}<br>
        d20=${d20Total} + ${essenceKey}(${essence}) + skill(${maxSkill})${bonus ? ` + bonus(${bonus})` : ""} = <strong>${total}</strong>
        <div style="opacity:.8;font-size:12px;margin-top:4px;">
          Skill dice: ${diceLine}
        </div>
        ${note}
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content
    });

    return { total, d20: d20Total, essence, maxSkill, bonus, skillResults };
  }
}
