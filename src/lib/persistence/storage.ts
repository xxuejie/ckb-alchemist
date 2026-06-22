/** localStorage key. Versioned so future schema changes can migrate cleanly. */
export const LS_KEY = "ckb-alchemist:v1";

/** `<script type="application/json">` element id in index.html. */
export const STATE_ELEMENT_ID = "alchemist-state";

export function isFileProtocol(): boolean {
  return typeof location !== "undefined" && location.protocol === "file:";
}

export function isWebProtocol(): boolean {
  return (
    typeof location !== "undefined" &&
    (location.protocol === "https:" || location.protocol === "http:")
  );
}

/** Returns the `<script id="alchemist-state">` element, or null. */
export function getStateElement(): HTMLElement | null {
  return typeof document !== "undefined"
    ? document.getElementById(STATE_ELEMENT_ID)
    : null;
}

/** Reads the `#alchemist-state` textContent (populated by a prior Save HTML). */
export function readEmbeddedState(): string | null {
  const el = getStateElement();
  const text = el?.textContent ?? "";
  return text.trim() ? text : null;
}

/** Overwrites `#alchemist-state` textContent (used by the mirror + Save HTML). */
export function writeEmbeddedState(text: string): void {
  const el = getStateElement();
  if (el) el.textContent = text;
}

/** localStorage read (web URLs only; returns null on file:// or on error). */
export function readLocalStorage(): string | null {
  if (!isWebProtocol()) return null;
  try {
    const v = localStorage.getItem(LS_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

/** localStorage write (web URLs only; no-op on file://). */
export function writeLocalStorage(text: string): void {
  if (!isWebProtocol()) return;
  try {
    localStorage.setItem(LS_KEY, text);
  } catch {
    // quota / privacy mode — ignore; #alchemist-state is the fallback.
  }
}

/** localStorage clear (used by session-only entry, Phase 2). */
export function clearLocalStorage(): void {
  if (!isWebProtocol()) return;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}
