/**
 * Session-level state. Tracks protocol detection, session-only mode (Phase 2
 * opt-in), and dirty-state tracking for `beforeunload` protection.
 *
 * `dirty` is derived from comparing the current graph serialization to a
 * snapshot captured at boot / Save HTML. The persistence layer updates it
 * via `setDirty`; `markClean` captures a new snapshot.
 */
const state = $state({
  isFileProtocol: typeof location !== "undefined" ? location.protocol === "file:" : false,
  sessionOnly: false,
  dirty: false,
  booted: false,
  cleanSnapshot: "",
});

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

  /** True iff `beforeunload` should warn the user about unsaved work. */
  get shouldWarnOnUnload(): boolean {
    return state.dirty && (state.isFileProtocol || state.sessionOnly);
  },
};
