import { PR20 } from "../config.mjs";
import { groupSkillsByEssence, clampNumber } from "../utils.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

export class PR20Charactermancer extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["pr20", "pr20-builder"],
    window: { title: "Character Builder", resizable: true },
    position: { width: 860, height: "auto" },
    actions: {
      create: PR20Charactermancer.#onCreate,
      cancel: PR20Charactermancer.#onCancel
    }
  });

  static PARTS = {
    app: { template: "systems/pr-essence20/templates/apps/charactermancer.hbs" }
  };

  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? null;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.actor = this.actor;
    context.creation = PR20.creation;
    context.armorTraining = Object.entries(PR20.armorTraining).map(([id, v]) => ({ id, label: v.label, bonus: v.morphedToughnessBonus }));

    context.skills = PR20.skills;
    context.skillGroups = groupSkillsByEssence(PR20.skills);
    context.essences = PR20.essences;

    return context;
  }

  static async #onCancel(event, target) {
    event.preventDefault();
    this.close();
  }

  static async #onCreate(event, target) {
    event.preventDefault();
    const form = this.element.querySelector("form");
    if (!form) return;

    // Gather form values
    const fd = new FormData(form);
    const get = (k, d="") => (fd.get(k) ?? d);

    const name = String(get("name", "New Ranger")).trim() || "New Ranger";

    const ess = {
      strength: clampNumber(get("essence.strength", 1), { min: 0 }),
      speed:    clampNumber(get("essence.speed", 1), { min: 0 }),
      smarts:   clampNumber(get("essence.smarts", 1), { min: 0 }),
      social:   clampNumber(get("essence.social", 1), { min: 0 })
    };

    const morphed = !!get("morphed");
    const training = String(get("armor.training", "light"));
    const armorBonusT = clampNumber(get("armor.bonusToughness", 0), { min: 0 });

    const baseHp = clampNumber(get("health.base", 0), { min: 0 });
    const hpVal  = clampNumber(get("health.value", 0), { min: 0 });
    const ppMax  = clampNumber(get("pp.max", 0), { min: 0 });
    const ppVal  = clampNumber(get("pp.value", 0), { min: 0 });
    const move   = clampNumber(get("move", 30), { min: 0 });

    // Skills
    const actorSkills = {};
    for (const [id, meta] of Object.entries(PR20.skills)) {
      const r = clampNumber(get(`skill.${id}.rank`, 0), { min: 0, max: meta.maxRank ?? 6 });
      const specialized = !!get(`skill.${id}.specialized`);
      const specialization = String(get(`skill.${id}.specialization`, ""));
      actorSkills[id] = {
        label: meta.label,
        essence: meta.essence,
        rank: r,
        specialized: specialized && !(meta.noSpec) && r > 0,
        specialization
      };
    }

    // Warnings (Option B: warn, don't hard-block; we ask “proceed?”)
    const warnings = [];

    const totalEss = ess.strength + ess.speed + ess.smarts + ess.social;
    if (totalEss !== PR20.creation.essencePoints) {
      warnings.push(`Essence total is ${totalEss} (expected ${PR20.creation.essencePoints} at level 1).`);
    }

    // per-essence skill budgeting (excluding conditioning)
    const spend = { strength: 0, speed: 0, smarts: 0, social: 0 };
    for (const [id, meta] of Object.entries(PR20.skills)) {
      if (id === "conditioning") continue;
      spend[meta.essence] += Number(actorSkills[id].rank ?? 0);
    }
    for (const k of Object.keys(spend)) {
      const cap = Number(ess[k] ?? 0);
      if (spend[k] > cap) warnings.push(`${k}: skill ranks spent ${spend[k]} exceeds essence score ${cap}.`);
    }

    // specialization sanity
    for (const [id, meta] of Object.entries(PR20.skills)) {
      const s = actorSkills[id];
      if (s.rank === 0 && !!get(`skill.${id}.specialized`)) warnings.push(`${meta.label}: specialization checked but rank is 0.`);
      if (meta.noSpec && !!get(`skill.${id}.specialized`)) warnings.push(`${meta.label}: cannot be specialized.`);
    }

    const proceed = async () => {
      // Create or update actor
      const actorData = {
        name,
        type: "character",
        system: {
          details: {
            level: clampNumber(get("level", 1), { min: 1 }),
            role: String(get("role", "")),
            origin: String(get("origin", "")),
            pronouns: String(get("pronouns", "")),
            description: String(get("description", "")),
            languages: String(get("languages", "")),
            influences: String(get("influences", "")),
            hangups: String(get("hangups", "")),
            notes: String(get("notes", ""))
          },
          toggles: { morphed },
          essences: {
            strength: { value: ess.strength },
            speed: { value: ess.speed },
            smarts: { value: ess.smarts },
            social: { value: ess.social }
          },
          skills: actorSkills,
          resources: {
            health: { base: baseHp, value: hpVal, max: 0 },
            personalPower: { max: ppMax, value: ppVal },
            movement: { value: move }
          },
          armor: { training, bonusToughness: armorBonusT }
        }
      };

      if (this.actor) {
        await this.actor.update({ name, system: actorData.system });
      } else {
        await Actor.create(actorData);
      }
      this.close();
    };

    if (warnings.length) {
      const content = `<div class="pr20-warn"><strong>Warnings (you can still proceed):</strong><ul>${warnings.map(w=>`<li>${w}</li>`).join("")}</ul></div>`;
      const ok = await new Promise(resolve => {
        new Dialog({
          title: "Proceed with warnings?",
          content,
          buttons: {
            yes: { label: "Proceed", callback: () => resolve(true) },
            no: { label: "Go Back", callback: () => resolve(false) }
          },
          default: "no",
          close: () => resolve(false)
        }).render(true);
      });
      if (!ok) return;
    }

    await proceed();
  }
}
