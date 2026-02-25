import { PR20 } from "./config.mjs";
import { PR20Actor } from "./documents/actor.mjs";
import { PR20Item } from "./documents/item.mjs";
import { PR20ActorSheet } from "./sheets/actor-sheet.mjs";
import { PR20ItemSheet } from "./sheets/item-sheet.mjs";
import { PR20Charactermancer } from "./apps/charactermancer.mjs";

Hooks.once("init", () => {
  // Ensure basic template helpers exist
  try {
    Handlebars.registerHelper("eq", (a, b) => a === b);
  } catch (e) { /* ignore */ }

  console.log("PR20 | Initializing pr-essence20 system");

  CONFIG.PR20 = PR20;

  CONFIG.Actor.documentClass = PR20Actor;
  CONFIG.Item.documentClass = PR20Item;

  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, "pr-essence20", PR20ActorSheet, {
    types: ["character", "npc"],
    makeDefault: true,
    label: game.i18n.localize("PR20.SheetTitle")
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, "pr-essence20", PR20ItemSheet, {
    types: PR20.itemTypes,
    makeDefault: true,
    label: game.i18n.localize("PR20.SheetTitle")
  });

  game.pr20 = game.pr20 ?? {};
  game.pr20.openCharactermancer = ({ actor = null } = {}) => {
    new PR20Charactermancer({ actor }).render(true);
  };
});

Hooks.on("renderActorDirectory", (app, html) => {
  try {
    const header = html[0]?.querySelector(".directory-header");
    if (!header) return;

    // Prevent duplicate injection
    if (header.querySelector('[data-pr20="builder"]')) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.pr20 = "builder";
    btn.innerHTML = `<i class="fas fa-user-gear"></i> ${game.i18n.localize("PR20.Charactermancer")}`;
    btn.style.marginTop = "6px";
    btn.addEventListener("click", () => game.pr20.openCharactermancer({}));

    header.appendChild(btn);
  } catch (e) {
    console.warn("PR20 | Failed to inject builder button", e);
  }
});
