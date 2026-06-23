/**
 * UI panel state shared between the TopBar (which triggers panels) and the
 * Canvas (which renders them as Svelte Flow `<Panel>` overlays).
 */
const state = $state({
  showTextPanel: false,
  showPalette: true,
  textExport: "",
  textImport: "",
  shareUrl: "",
});

export const ui = {
  get showTextPanel(): boolean {
    return state.showTextPanel;
  },
  get showPalette(): boolean {
    return state.showPalette;
  },
  get textExport(): string {
    return state.textExport;
  },
  get textImport(): string {
    return state.textImport;
  },
  get shareUrl(): string {
    return state.shareUrl;
  },

  togglePalette() {
    state.showPalette = !state.showPalette;
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
  openSharePanel(url: string) {
    state.shareUrl = url;
  },
  closeSharePanel() {
    state.shareUrl = "";
  },
};
