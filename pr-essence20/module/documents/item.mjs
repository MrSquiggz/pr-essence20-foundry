export class PR20Item extends Item {
  prepareBaseData() {
    super.prepareBaseData();
    this.system.description ??= "";
    this.system.effects ??= {};
  }
}
