/**
 * UI panel state shared between the TopBar (which triggers panels) and the
 * Canvas (which renders them as Svelte Flow `<Panel>` overlays).
 */
const state = $state({
  showTextPanel: false,
  textExport: "",
  textImport: "",
});

export const ui = {
  get showTextPanel(): boolean {
    return state.showTextPanel;
  },
  get textExport(): string {
    return state.textExport;
  },
  get textImport(): string {
    return state.textImport;
  },

  openTextPanel(exported: string) {
    state.textExport = exported;
    state.textImport = "";
    state.showTextPanel = true;
  },
  closeTextPanel() {
    state.showTextPanel = false;
  },
  setTextImport(value: string) {
    state.textImport = value;
  },
};
