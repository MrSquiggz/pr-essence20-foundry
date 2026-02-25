import { PR20 } from "../config.mjs";
import { groupSkillsByEssence, clampNumber } from "../utils.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class PR20ActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["pr20", "sheet", "actor"],
    position: { width: 860, height: "auto" },
    actions: {
      rollSkill: PR20ActorSheet.#onRollSkill,
      openBuilder: PR20ActorSheet.#onOpenBuilder,
      createItem: PR20ActorSheet.#onCreateItem,
      deleteItem: PR20ActorSheet.#onDeleteItem
    }
  });

  static PARTS = {
    form: { template: "systems/pr-essence20/templates/actor/character-sheet.hbs" }
  };

  get actor() { return this.document; }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.system = this.actor.system;
    context.config = PR20;

    context.armorTraining = Object.entries(PR20.armorTraining).map(([id, v]) => ({ id, label: v.label, bonus: v.morphedToughnessBonus }));

    context.essences = Object.entries(PR20.essences).map(([id, meta]) => ({
      id, label: meta.label, value: this.actor.system.essences?.[id]?.value ?? 1
    }));

    const skillsMeta = PR20.skills;
    const groups = groupSkillsByEssence(skillsMeta);
    const actorSkills = this.actor.system.skills ?? {};

    function skillRow(id, meta) {
      const s = actorSkills[id] ?? {};
      return {
        id,
        label: meta.label,
        essence: meta.essence,
        noRoll: !!meta.noRoll,
        noSpec: !!meta.noSpec,
        rank: s.rank ?? 0,
        specialized: !!s.specialized,
        specialization: s.specialization ?? "",
        notes: s.notes ?? ""
      };
    }

    context.skillGroups = {
      strength: groups.strength.map(s => skillRow(s.id, skillsMeta[s.id])),
      speed: groups.speed.map(s => skillRow(s.id, skillsMeta[s.id])),
      smarts: groups.smarts.map(s => skillRow(s.id, skillsMeta[s.id])),
      social: groups.social.map(s => skillRow(s.id, skillsMeta[s.id]))
    };

    // Items grouped by type
    const itemsByType = {};
    for (const t of PR20.itemTypes) itemsByType[t] = [];
    for (const it of this.actor.items) (itemsByType[it.type] ??= []).push(it);
    context.itemsByType = itemsByType;

    return context;
  }

  static async #onRollSkill(event, target) {
    event.preventDefault();
    const skillId = target.dataset.skill;
    if (!skillId) return;

    const meta = PR20.skills[skillId];
    if (meta?.noRoll) {
      ui.notifications?.info(`${meta.label} isn't rolled as a normal skill check.`);
      return;
    }

    const actor = this.actor;
    const s = actor.system.skills?.[skillId] ?? {};
    const defaultSpecialized = !!s.specialized && !(meta?.noSpec);

    const content = `
      <form>
        <div class="form-group">
          <label>Roll mode</label>
          <select name="mode">
            <option value="normal">Normal</option>
            <option value="edge">Edge (keep higher)</option>
            <option value="snag">Snag (keep lower)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Bonus (flat)</label>
          <input type="number" name="bonus" value="0" />
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="specialized" ${defaultSpecialized ? "checked" : ""}/> Use specialization (if eligible)</label>
        </div>
        <p style="opacity:.8;font-size:12px;margin-top:6px;">
          Heads up: if you have 0 ranks, Snag is applied automatically (unless you have Edge that cancels it).
        </p>
      </form>
    `;

    const data = await new Promise(resolve => {
      new Dialog({
        title: `Roll: ${meta?.label ?? skillId}`,
        content,
        buttons: {
          roll: {
            label: "Roll",
            callback: (html) => {
              const mode = html.find('[name="mode"]').val();
              const bonus = Number(html.find('[name="bonus"]').val() ?? 0);
              const specialized = html.find('[name="specialized"]')[0]?.checked ?? false;
              resolve({ mode, bonus, specialized });
            }
          },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        },
        default: "roll",
        close: () => resolve(null)
      }).render(true);
    });

    if (!data) return;

    const edge = data.mode === "edge";
    const snag = data.mode === "snag";
    await actor.rollSkill(skillId, { edge, snag, bonus: data.bonus, forceSpecialized: data.specialized });
  }

  static async #onOpenBuilder(event, target) {
    event.preventDefault();
    game.pr20?.openCharactermancer?.({ actor: this.actor });
  }

  static async #onCreateItem(event, target) {
    event.preventDefault();
    const type = target.dataset.type;
    if (!type) return;
    await this.actor.createEmbeddedDocuments("Item", [{ name: `New ${type}`, type, system: {} }]);
  }

  static async #onDeleteItem(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    await item.delete();
  }
}
