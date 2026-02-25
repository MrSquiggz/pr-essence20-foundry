const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class PR20ItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["pr20", "sheet", "item"],
    position: { width: 520, height: "auto" }
  });

  static PARTS = {
    form: { template: "systems/pr-essence20/templates/item/item-sheet.hbs" }
  };

  get item() { return this.document; }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    return context;
  }
}
