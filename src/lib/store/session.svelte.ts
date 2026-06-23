import type { WorkflowJson } from "$lib/persistence/schema";

export interface BootSource {
  id: string;
  label: string;
  workflow: WorkflowJson;
}

/**
 * Session-level state. Tracks protocol detection, session-only mode,
 * dirty-state tracking for `beforeunload` protection, and the boot
 * source selection dialog (PLAN §7.6).
 */
const state = $state({
  isFileProtocol: typeof location !== "undefined" ? location.protocol === "file:" : false,
  sessionOnly: false,
  dirty: false,
  booted: false,
  cleanSnapshot: "",
  pendingSources: null as BootSource[] | null,
});

let resolveChoice: ((source: BootSource) => void) | null = null;

export const session = {
  get isFileProtocol(): boolean {
    return state.isFileProtocol;
  },
  get sessionOnly(): boolean {
    return state.sessionOnly;
  },
  get dirty(): boolean {
    return state.dirty;
  },
  get booted(): boolean {
    return state.booted;
  },
  get cleanSnapshot(): string {
    return state.cleanSnapshot;
  },
  get pendingSources(): BootSource[] | null {
    return state.pendingSources;
  },

  setDirty(value: boolean) {
    state.dirty = value;
  },
  markClean(snapshot: string) {
    state.cleanSnapshot = snapshot;
    state.dirty = false;
  },
  markBooted() {
    state.booted = true;
  },
  enterSessionOnly() {
    state.sessionOnly = true;
  },

  /** Show the boot source selection dialog. */
  setPendingSources(sources: BootSource[]) {
    state.pendingSources = sources;
  },

  /** Called by BootDialog when user picks a source. */
  chooseSource(source: BootSource, sessionOnly = false) {
    state.pendingSources = null;
    if (sessionOnly) state.sessionOnly = true;
    resolveChoice?.(source);
    resolveChoice = null;
  },

  /** Returns a promise that resolves when the user picks a source. */
  waitForSourceChoice(): Promise<BootSource> {
    return new Promise((resolve) => {
      resolveChoice = resolve;
    });
  },

  /** True iff `beforeunload` should warn the user about unsaved work. */
  get shouldWarnOnUnload(): boolean {
    return state.dirty && (state.isFileProtocol || state.sessionOnly);
  },
};
