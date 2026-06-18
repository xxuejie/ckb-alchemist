# CKB Alchemist — Rebuild Plan

A visual, node-based builder for CKB transactions. The graph *is* the source of truth: nodes produce typed outputs, edges carry them to consumers, and the assembled canvas compiles down to a CKB transaction.

This document captures the agreed plan for rebuilding the existing Rust + egui + WASM tool as a modern web app.

---

## 1. Background

### 1.1 What exists today

The current `ckb-alchemist` is a Rust + egui + Trunk + WASM single-page app. Its useful ideas:

- **`src/app.rs`** — `RootApp` holds a flat `Vec<(Box<dyn Widget>, WidgetContext)>` plus a `GlobalContext`.
- **`src/widgets/mod.rs`** — defines a `Widget` trait and the **slot model**: `GlobalContext` is a `HashMap<u64, String>` keyed by id. Each widget publishes an `Output`, optionally saves it to a slot id, and other widgets pull from that slot.
- **Four widgets**: `ScriptAssembler`, `CkbHash`, `Concat`, `Slice`.
- **`src/widgets/utils.rs`** — `blake2b_256` with the `b"ckb-default-hash"` personalization, hex helpers, and a side-panel slot chooser UI.

The slot model is conceptually a **poor-man's dataflow DAG**: today's `Output → slot id → input` is exactly what a flow library calls "handles + edges". The rebuild makes that explicit and visual.

### 1.2 Why rebuild

- Rust + WASM has rough edges for rich web UIs; iteration loop is slower than a modern JS toolchain.
- The slot/propagate model is correct in spirit but expressed as side-panel combo boxes — there is no visualization of the dataflow.
- The end goal is a Blueprint-style canvas where users *see* cells transform through a CKB transaction. That needs a first-class node graph, not floating windows.

### 1.3 What carries forward

- The **Output → consumer** dataflow model. Becomes typed graph edges.
- The **four widget behaviors**. Become the v1 node set.
- The **`refresh()` on change → `propagate()` to consumers** loop. Becomes topological evaluation.

### 1.4 What gets dropped

- All of `egui` / `eframe` / `trunk` / `wasm-bindgen`.
- `ckb-standalone-types` and `blake2b-ref` — replaced by `@ckb-ccc/core` (typed primitives + molecule codecs) and `@ckb-ccc/ckb` (RPC client).
- The floating-window `egui::Window` model — replaced by Svelte Flow nodes.

The Rust crate stays in the repo as reference during the rebuild. Once Phase 1 ships and parity is verified, the Rust sources are removed (git history preserves them) and the contents of `web/` move to the repo root.

---

## 2. Locked decisions

- **Framework**: Svelte 5 + Svelte Flow + Vite + TypeScript + Tailwind.
- **Deployment**: **Single HTML file, modeled on [Tiddlywiki](https://tiddlywiki.com/).** Tiddlywiki is the canonical example of this pattern — the entire application (code, styles, and user content) lives in one self-contained `index.html` that can be opened from `file://`, hosted on any static server, emailed as an attachment, or carried on a USB stick. The app reads and writes its own state back into the HTML file. We mirror this exactly:
  - Production build emits a single `index.html` with all JS, CSS, and assets inlined via `vite-plugin-singlefile`. No code splitting, no external chunks, no backend.
  - The file must work from `file://` — opening it locally runs the full app offline (only RPC needs network, and a local node works fine).
  - "Save HTML" serializes the live document. Because state is already in `#alchemist-state`, the downloaded file carries the user's work (see §7.2).
  - This rules out SvelteKit (server-shaped) in favor of plain Vite + Svelte.
- **Layout**: New app at `web/`. After Phase 1 verification, promote to repo root.
- **Scope of v1 (Phase 1)**: Feature parity with the current Rust tool.
- **CKB RPC**: Pluggable from day one. User supplies a URL (mainnet, testnet, or dev chain). Not hardcoded. No node in Phase 1 actually consumes it, but the connection config lives in a top-level store so Phase 3+ nodes can use it.
- **Persistence**: All serverless. Behavior is **protocol-aware** — `file://` and `https://` have different persistence models because refresh behaves fundamentally differently in each.
  1. **Save HTML** — when the user saves the current page as an HTML file (the core Tiddlywiki mechanic), the resulting file contains the current graph baked in. Reopening that HTML restores the same transaction-flow graph. This is the primary portable persistence story in both environments.
  2. **Load / save as URL-encoded text** — workflow exchanged as a plain URL-encoded string (gzip + base64url). For chat paste, version control, etc.
  3. **`localStorage` mirror (web URLs only)** — on `https://` origins, `$state` is mirrored to both `#alchemist-state` *and* `localStorage` so that refresh recovers in-session work and Save HTML captures current state. On `file://`, **localStorage is not used** — the file itself is the persistence, and refresh reverts to the last Save HTML (the Tiddlywiki model).
  4. **Dirty-state protection on `file://`** — if the user has unsaved modifications (current `$state` differs from what was in `#alchemist-state` at boot), `beforeunload` triggers the browser's native "leave site?" confirmation. Save HTML resets the dirty flag. No alert on web URLs (refresh is recoverable via localStorage).
- **Shareable URL via query parameters**: deferred to Phase 2. Two modes:
  - `?data=<encoded>` — workflow inlined in the URL (gzip + base64url). Subject to URL length limits (~2k chars safe).
  - `?gist=<gist-id>` — fetches the workflow from a GitHub gist. For workflows too large to fit in a query parameter. Client-side `fetch` to `gist.githubusercontent.com` (CORS-friendly); the result is cached into `#alchemist-state` after first load so the link stays usable even if the gist is later removed.
  - Note: query parameters are sent to the server on hosted deployments (unlike hash fragments). On `file://` they're local-only. This is an accepted trade-off.
  - No hash URL is used in this app.

---

## 3. Framework rationale

Considered alternatives: React Flow, n8n's custom Vue solution, rete.js.

Chosen **Svelte Flow**:

- Maintained by the same team as React Flow (xyflow), with deliberate API parity.
- Built on Svelte 5 runes — performance and ergonomics the user wants to learn.
- No restrictions block this project. Confirmed capabilities:
  - Typed custom nodes, handles, and edges
  - `isValidConnection` for type-checking edges at connect time
  - Dagre, ELK, D3 auto-layout integrations
  - Subflows (useful later for lock groups / witness groups)
  - Drag-and-drop palette, context menus, theming with Tailwind
  - `useConnection`, `useSvelteFlow`, `useNodesData` hooks for live evaluation

Trade-off accepted: smaller ecosystem than React Flow, occasional version churn. Acceptable for this project's scope and the user's learning goal.

---

## 4. Architecture

Three layers, framework-agnostic at the bottom:

### 4.1 Domain layer — `src/lib/ckb/`

Pure TypeScript, no UI. The CKB TypeScript ecosystem has moved on from Lumos (now deprecated) to **CCC** (`@ckb-ccc/*`). For Phase 1 we adopt the lean subset of CCC and hand-code only what it doesn't provide:

- **`@ckb-ccc/core`** — typed primitives (`Cell`, `Script`, `OutPoint`, `Hash`) and molecule codecs. Replaces our need to hand-code `Script` serialization.
- **`@ckb-ccc/ckb`** — CKB RPC client. Phase 1 doesn't consume it functionally yet, but the client is instantiated from the user-supplied URL and held in a top-level store so Phase 3+ nodes can use it.
- **Hand-coded shims only as needed** — hex helpers and any small utility not exposed by core. Expect this to be minimal.

Deferred until Phase 4+ (signing path): `@ckb-ccc/provider` and the wallet/signer family — these are the heavier packages. Replaces `blake2b-ref`, `ckb-standalone-types`, and the Rust hex/hash utilities.

### 4.2 Node-spec layer — `src/lib/nodes/`

Declarative registry of node types. Each spec declares:

- **Input handles** — typed (`Bytes`, `Script`, `Hash`, `Number`).
- **Output handle** — single, typed.
- **Param schema** — form fields rendered inside the node (e.g., hash type selector, slice bounds).
- **`evaluate(inputs, params) → output`** — pure function.

This is what makes the graph testable headlessly and what makes adding new nodes cheap.

### 4.3 Graph engine — `src/lib/engine/`

Topological evaluation over the Svelte Flow graph. Replaces today's `refresh()` + `propagate()` loop with an explicit, correct dataflow:

- On any node/edge change, recompute in dependency order.
- Surface per-node errors and per-edge previews.
- Type checking on connect via Svelte Flow's `isValidConnection`.

### 4.4 UI layer — `src/routes/` + `src/components/`

Thin. Custom Svelte components for each node type, an inspector panel, a top bar with RPC URL, share/export buttons. The canvas itself is `<SvelteFlow>` with `Background`, `Controls`, `MiniMap`.

---

## 5. Type system on edges

Edges carry a type so the connection validator can reject mismatched wiring. The current Rust code has no such guard.

Phase 1 types:

| Type | Meaning |
|---|---|
| `Bytes` | Raw hex bytes (the current `String` slot values, typed) |
| `Script` | Assembled CKB Script |
| `Hash` | 32-byte blake2b output (subtype of `Bytes` for ergonomics, displayed distinctly) |
| `Number` | For Slice's start/end (replaces free-form text fields) |

Each node declares input/output types; `isValidConnection` enforces them; invalid connections animate red via `useConnection`.

---

## 6. Phase 1 node set

| Node | Inputs | Params | Output | Ports from |
|---|---|---|---|---|
| `HexInput` | — | hex textarea | `Bytes` | new (extracts manual text fields from other widgets) |
| `ScriptAssembler` | `code_hash: Hash`, `args: Bytes` | hash_type (Data / Type / Data1 / DataN + n) | `Script` | `src/widgets/script.rs` |
| `CkbHash` | `content: Bytes` | — | `Hash` | `src/widgets/ckb_hash.rs` |
| `Concat` | `a: Bytes`, `b: Bytes` | — | `Bytes` | `src/widgets/concat.rs` |
| `Slice` | `input: Bytes` | start, end (numbers) | `Bytes` | `src/widgets/slice.rs` |

Default canvas seed (mirrors `RootApp::default`): a `ScriptAssembler` whose `Script` output feeds a `CkbHash` input — demonstrating the script-hash pipeline.

### 6.1 Preserved behaviors

- **`DataN` validation**: the Rust code rejects `n > 127` (encoded as `n << 1` in a single byte). The rebuild preserves that exact rule.
- **Hash output format**: `0x`-prefixed lowercase hex, matching `format!("0x{:x}", ...)` in the Rust code.
- **Error surfacing**: per-node, red-text style, same as today.

---

## 7. Persistence

**Architecture: an in-DOM state section is the *persistence* source of truth; Svelte's reactive state remains the *runtime* source of truth.**

These are two distinct roles and conflating them would fight any modern framework (React included). The split:

- **Runtime source of truth**: Svelte 5 reactive state (`$state` runes). The UI renders from this; Svelte's normal reactivity drives all interaction.
- **Persistence source of truth**: a `<script type="application/json" id="alchemist-state"></script>` block in the document's `<head>`. It is a *mirror*, written one-way from the reactive state via a debounced `$effect`. It is *read* only at boot to seed `$state`; after boot, it is strictly an output.

Data flow:

```
boot:     #alchemist-state  →  $state          (one-time seed)
runtime:  $state            →  UI              (Svelte reactivity)
          $state            →  #alchemist-state (debounced $effect, one-way mirror)
save HTML: document.outerHTML                   (already has the mirrored state)
load text: decode           →  $state          (the $effect catches up and rewrites the mirror)
```

Concretely, the persistence flows become:

- **Live updates**: a single Svelte `$effect` mirrors `$state` → `#alchemist-state.textContent` (debounced ~200–500ms). On web URLs, a parallel mirror writes to `localStorage`. On `file://`, only `#alchemist-state` is written.
- **Save HTML**: trivially captures current state because the mirror is already in the DOM at save time. Resets the dirty flag (§7.7).
- **Load / save as text**: encode/decode against `$state`. Loading writes to `$state`; the `$effect` then mirrors into `#alchemist-state` (and `localStorage` on web URLs) so the next Save HTML is consistent.
- **Boot**: read from the appropriate source (§7.6), seed `$state`, run.
- **Shareable URL via query parameters (`?data=` / `?gist=`)**: Phase 2 only. Boot-only — read once at startup to seed `$state`, never kept in sync with subsequent edits. If `localStorage` also has content (web URLs only), a selection dialog prompts the user to choose (§7.6).

This is exactly the Tiddlywiki model from the user's perspective — the live document *is* the saved document — but implemented in a framework-idiomatic way. The DOM is never read at runtime, so there's no read/write loop and no fighting the reactivity model.

The serialized workflow is JSON-shaped (schema still TBD; will at least round-trip the Svelte Flow graph plus RPC URL):

```json
{
  "version": 1,
  "rpcUrl": "https://testnet.ckbapp.dev/",
  "nodes": [
    { "id": "...", "type": "...", "data": {}, "position": [0, 0] }
  ],
  "edges": [
    { "id": "...", "source": "...", "target": "...", "sourceHandle": "...", "targetHandle": "..." }
  ]
}
```

### 7.1 Feasibility on Svelte + Vite

Confirmed for all flows — no `fetch()`, no service worker, no backend required. All work identically on `http(s)://` and `file://`.

- The source `index.html` includes the `<script type="application/json" id="alchemist-state"></script>` placeholder in `<head>`. This placeholder survives the production build.
- `vite-plugin-singlefile` inlines all JS, CSS, and assets into the production HTML — the file is already self-contained at build time.
- Writing to `textContent` of a `<script type="application/json">` tag is fast and doesn't trigger reflow of the visible document. Debounced (e.g., 200–500ms after last graph change), it has no perceptible perf cost even with frequent edits.
- The DOM mirror is read only at boot; runtime reads come from Svelte's reactive state. No observer on the DOM side, no read/write loop.

### 7.2 Save HTML (the Tiddlywiki mechanic)

Because `#alchemist-state` is always live:

1. **Flush any pending mirror write synchronously** before serializing — see below.
2. Temporarily clear `#app`'s innerHTML (so Svelte's rendered DOM doesn't get serialized into the snapshot — it'll re-hydrate cleanly on next open).
3. Capture `<!DOCTYPE html>\n` + `document.documentElement.outerHTML`.
4. Restore `#app`'s contents (so the running UI is unaffected).
5. Wrap the captured HTML in a `Blob` and trigger a download.
6. Reset the dirty flag (file on disk now matches memory).

**Mirror-flush mechanism** (avoids stale Save HTML):

- Every `$state` mutation sets a synchronous `mirrorDirty` flag (cheap, no I/O).
- A debounced `$effect` writes `#alchemist-state.textContent` from `$state`, then clears `mirrorDirty`.
- Save HTML checks `mirrorDirty` first — if set, writes `#alchemist-state.textContent` synchronously *before* serialization, then clears the flag.
- Guarantees the captured snapshot always reflects the latest `$state` regardless of debounce timing.

### 7.3 Load / save as URL-encoded text

- **Save**: read `#alchemist-state.textContent` → `pako.gzip` → base64url. Plain text, pasteable into chat, issues, version control, etc.
- **Load**: decode the text → write the result into `$state` → the `$effect` mirrors into `#alchemist-state`. Also accepts raw JSON for human-edited workflows.
- Exact schema is TBD; transport is settled (URL-encoded text).

### 7.4 Shareable URL (Phase 2)

Deferred. When added, it uses **query parameters, not hash fragments**. No `#w=...` scheme is used in this app.

Two modes, both boot-only (read once at startup to seed `$state`, never written back to the URL by the running app):

- **`?data=<encoded>`** — workflow inlined in the URL. Encoding TBD at Phase 2 time; working assumption is JSON → compressed (`pako.gzip`, or a more compact JS-friendly algorithm if available) → base64url. Subject to URL length limits (~2k chars is the universally safe cap).
- **`?gist=<gist-id>`** — fetches the workflow from a GitHub gist as **raw JSON** (human-readable, editable in the gist UI; size irrelevant when fetching). The escape hatch for workflows too large to fit in `?data=`. Client-side `fetch` to `https://gist.githubusercontent.com/<user>/<id>/raw` (CORS-friendly on `https://` origins). **Note**: blocked by CORS on `file://` origins — `?gist=` is web-URL only, and query params on `file://` are ignored anyway (see §7.6). The fetched payload is decoded into `$state` and then mirrored into `#alchemist-state`, so the link stays usable even if the gist is later removed or GitHub is down on a subsequent visit.

**Failure handling**: if `?data=` fails to parse or `?gist=` fails to fetch, the app falls back to the next item in the boot sequence (typically `localStorage` on web URLs) and surfaces a non-blocking error banner at the top of the page: "Failed to load workflow from link: \<reason\>. Loaded from \<fallback\> instead." The user is never stuck on a blank canvas.

Trade-off accepted: query parameters are sent to the server on hosted deployments (they appear in request logs). On `file://` they're local-only and never transmitted. If a deployment needs zero-server-exposure, the answer is "use Save HTML or text load/save instead" — both fully client-side.

A "Share" button generates `?data=...` for small workflows and prompts the user to create a gist (manual flow; OAuth-based auto-gist creation is a later possibility) for large ones.

### 7.5 `localStorage` mirror (web URLs only)

- On `https://` origins, `$state` is mirrored to `localStorage` in parallel with `#alchemist-state`. This enables refresh recovery: the served HTML is static, so without localStorage the user's in-session work would be lost on refresh.
- On `file://`, **`localStorage` is not used at all**. The file IS the persistence; refresh reverts to the last Save HTML. This avoids the cross-browser unreliability of `file://` origins and matches the Tiddlywiki mental model.
- Protocol is detected via `location.protocol !== 'file:'`. The check happens once at boot and the chosen persistence strategy stays fixed for the session.
- **Multi-tab caveat**: same-origin tabs share `localStorage`, so two tabs editing in normal mode would silently overwrite each other's saved state. We do **not** implement real-time cross-tab sync (`storage` event is not listened to). The working assumption is: multiple tabs on the same URL converge on refresh, not in real time. Users who need concurrent flows should use session-only mode (§7.8) per tab.

### 7.6 Boot sequence

The boot source depends on environment and incoming URL:

**Web URLs (`https://`)**:

1. If both `?data=` / `?gist=` is present **and** `localStorage` has content → show a selection dialog with **two primary buttons**, **two secondary links**, and **one alternate-mode entry**:
   - **Buttons** (load + dismiss):
     - "Load from link" → seed `$state` from the URL payload.
     - "Load from saved state" → seed `$state` from `localStorage`.
   - **Links** (download only, dialog stays open):
     - "Download link state as file" → triggers a JSON download of the URL payload (same format as §7.3 text export).
     - "Download saved state as file" → triggers a JSON download of the `localStorage` contents.
   - **Alternate mode** (load + dismiss, enters session-only mode — see §7.8):
     - "Open as session-only" → seed `$state` from the URL payload, do **not** touch `localStorage`, treat the session like `file://` for persistence purposes.
   - Use case for the links: user has unsaved work in `localStorage` and receives a shared link. They can download the `localStorage` state as a backup file *first*, then click "Load from link" without losing anything.
   - Use case for session-only: user wants to keep multiple tabs open with different flows simultaneously, without any tab's `localStorage` clobbering another's.
   - After a button is clicked, strip the query param via `history.replaceState` so subsequent refreshes don't re-trigger the dialog.
2. Else if `?data=` / `?gist=` is present → decode → seed `$state` → strip the query param.
3. Else if `localStorage` has content → load from localStorage.
4. Else → default seed graph.

**`file://` URLs**:

1. `#alchemist-state` embedded script tag (populated by a prior Save HTML).
2. Else → default seed graph.

(Query parameters on `file://` are unreliable and ignored — users on `file://` use Save HTML for sharing, not links.)

After boot, capture an initial state snapshot for dirty tracking (§7.7).

### 7.7 Dirty-state protection (`file://` and session-only mode)

On `file://` (and on web URLs in session-only mode — §7.8), the browser cannot modify the local file or `localStorage` — only explicit Save HTML writes a new file to disk. So if the user refreshes or closes the tab with unsaved modifications, that work is lost.

- A snapshot of `$state` is taken at end of boot.
- Dirty flag = current `$state` differs from the snapshot.
- `beforeunload` handler: if dirty and (`location.protocol === 'file:'` **or** session-only mode is active), call `event.preventDefault()` to trigger the browser's native "leave site?" confirmation dialog.
- Save HTML resets the dirty flag (file on disk now matches memory).
- No dirty alert on web URLs in normal mode — refresh is recoverable via `localStorage`, and tab close persists to `localStorage` too.

### 7.8 Session-only mode — web URLs only

A session-level mode, opt-in via the selection dialog (§7.6) on web URLs. Behaves exactly like `file://` for persistence purposes:

- `localStorage` is **not** read from or written to for the entire session.
- `$state` is mirrored only into `#alchemist-state` (in memory).
- Dirty-state `beforeunload` protection is active (§7.7).
- Refresh or close tab without Save HTML = lose work, with browser-native warning.

**Visible indicator**: a small overlay in the top-right corner of the canvas (e.g., a pill labeled "Session-only") with a tooltip explaining: "This session won't persist to your browser. Save HTML to keep your work."

**Session property, not document property**: session-only mode is *not* serialized into the saved HTML. If a user in session-only mode clicks Save HTML, the resulting file is a normal document — opening it later (as `file://`) starts a normal session. Rationale: the file is already self-contained and persistent via Save HTML; the session-only marker only makes sense for in-browser sessions where `localStorage` would otherwise be touched.

**Default**: web URLs default to normal (localStorage-mirroring) mode. Session-only is opt-in only, via the dialog when both a link payload and `localStorage` content exist.

**Future nicety (not in Phase 2 scope)**: a "Save to localStorage" button inside the session-only overlay, to promote a session-only session to a normal one without losing work.

---

## 8. Phased roadmap

### Phase 0 — Scaffolding (~0.5 day)

- `web/` with Vite + Svelte 5 + TypeScript + Tailwind.
- `vite-plugin-singlefile` configured — production build emits a single `index.html` with all JS/CSS/assets inlined. No code splitting.
- ESLint, Prettier, Vitest.
- `pnpm dev` / `build` / `test` / `lint` scripts.
- CI step mirroring `check.sh`. CI artifact: the single `index.html`, opened headlessly to confirm it boots.

### Phase 1 — Rebuild the four widgets as nodes (~1–2 days)

1. Scaffold `web/` (above). Wire scripts.
2. Install `@ckb-ccc/core`, `@ckb-ccc/ckb`, and Svelte Flow. Stub `<SvelteFlow>` canvas with `Background`, `Controls`, `MiniMap`.
3. Implement `src/lib/ckb/` (hex helpers + thin wrappers over `@ckb-ccc/core`) + unit tests porting the Rust behavior.
4. Implement node-spec registry + topological engine + type-checking connection validator.
5. Build the five node components with typed handles and inline result preview.
6. Add RPC URL config bar (stored, not yet consumed).
7. Add persistence: implement the unified `#alchemist-state` in-DOM section (§7), debounced live updates from the Svelte store, Save HTML serialization (§7.2), URL-encoded text load/save (§7.3), protocol-aware `localStorage` mirror (§7.5), dirty-state `beforeunload` protection on `file://` (§7.7). Shareable URL (§7.4) and the selection dialog (§7.6) are **not** in Phase 1.
8. Seed default graph; verify parity with the current Rust tool.
9. Verify the production `index.html` build boots from `file://` (open the saved file directly in a browser) and that all features work offline except RPC.

**Deliverable**: pixel-for-pixel capability equivalent to today's egui app, but on a canvas with real typed edges replacing "slots".

### Phase 2 — First CKB transaction primitive (later, ~2–3 days)

- `CellTemplate` (capacity + lock + optional type + data) → `Cell`.
- `TransactionBuilder` (inputs + outputs + cell_deps) → unsigned `Transaction`.
- `TxHash` node.
- Inspector rendering the canonical JSON shape (`cell_deps`, `header_deps`, `inputs`, `outputs`, `outputs_data`, `witnesses`).
- Dagre auto-layout.
- **Undo / redo** — command stack over graph mutations (node add/remove, edge connect/disconnect, param edits, position moves). Keyboard shortcuts (Ctrl/Cmd-Z, Shift-Ctrl/Cmd-Z).
- **Shareable URL via query parameters** (§7.4) — `?data=` for small workflows, `?gist=` for large ones. Boot-only; share button generates the appropriate variant. Selection dialog (§7.6) with primary load buttons, secondary download-as-file links, and an "Open as session-only" entry (§7.8).

### Phase 3 — Cell awareness (later, ~2–4 days)

- `CellSource` fetching live cells via the configured RPC.
- Capacity arithmetic and validation.
- Auto-suggested cell deps for known scripts.

### Phase 4 — Signing path (later, larger scope)

- `WitnessArgs` builder, lock-group partitioning, signer abstraction.
- Wallet integration (Secp256k1, OMNI, JoyID, etc.).

---

## 9. Open nuances

- **URL length cap**: ~2k chars is the universally safe limit. Compressed workflow JSON should stay well under that for Phase 1 graphs (5–20 nodes). When we outgrow it (Phase 2+), `?gist=` is the escape hatch.
- **`file://` origin behavior**: `localStorage` is unreliable across browsers on `file://` (Chrome treats each `file://` URL as an opaque origin; Firefox shares origins but with quirks; Safari is restrictive). Rather than wrap an unreliable API in `try/catch` and hope, the design **does not use `localStorage` at all on `file://`** — the file IS the persistence (Tiddlywiki model), and dirty-state `beforeunload` protection (§7.7) prevents accidental loss. This sidesteps the entire class of origin-policy bugs.
- **No service workers, no fetch of local files**: ruled out on `file://`. Not needed since everything is inlined.
- **Bundle size**: standard techniques only (tree-shaking, minification). No strict budget for now; revisit if it becomes painful.
- **Svelte 5 runes learning curve**: hits at the same time as the flow library. Acceptable per user's learning goal.
- **Cross-browser**: target Chrome + Safari on desktop. Safari is quirky with `beforeunload` and the download API; an early sanity check on both browsers is required during Phase 1. Firefox and mobile are not priorities.
- **Accessibility**: deferred. One low-hanging-fruit rule adopted now — **color-blind-friendly palette**, paired with shape/text redundancy wherever color conveys meaning. Specifically: invalid edges must not rely on red color alone (use dashed stroke + a "type mismatch" label as well). Full a11y pass is a later concern.
- **Schema versioning**: a `version` field is present from day one. The schema itself is TBD; the design intent is a JSON-shaped schema aimed at backward compatibility. Exact migration policy (strict vs best-effort) decided when the schema lands.

---

## 10. Repo layout (target)

```
web/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── index.html
├── src/
│   ├── app.html
│   ├── lib/
│   │   ├── ckb/            # pure TS domain layer (wraps @ckb-ccc/core)
│   │   ├── nodes/          # node-spec registry
│   │   ├── engine/         # topological evaluation
│   │   ├── persistence/    # localStorage, JSON, URL codec, HTML self-export
│   │   └── store/          # Svelte stores (graph state, RPC config)
│   ├── components/
│   │   ├── canvas/         # SvelteFlow wrapper, Background, Controls, MiniMap
│   │   ├── nodes/          # one component per node type
│   │   ├── edges/          # custom edge components if needed
│   │   └── panels/         # top bar, inspector, palette
│   └── routes/
│       └── +page.svelte
└── tests/
    ├── ckb/                # parity tests against Rust behavior
    ├── engine/             # topological eval tests
    └── persistence/        # round-trip codec tests
```

Note: routes structure assumes SvelteKit. A plain Vite + Svelte setup is also fine for v1 — to be decided in Phase 0 scaffolding based on whether we want routing/SSR from day one.

---

## 11. Definition of done (Phase 1)

- [ ] All five nodes (`HexInput`, `ScriptAssembler`, `CkbHash`, `Concat`, `Slice`) implemented with typed handles.
- [ ] Type-checking on connect: invalid edges rejected, with dashed stroke + label (not red color alone).
- [ ] Inline result preview on each node + per-edge data preview.
- [ ] `#alchemist-state` in-DOM section updates live (debounced) on every graph change.
- [ ] `mirrorDirty` flag flushed synchronously on Save HTML (no stale snapshots — covered by an explicit round-trip test).
- [ ] Default seed graph loads on first visit and is mirrored into `#alchemist-state`.
- [ ] Save HTML produces a self-contained file that rehydrates the same graph on next open.
- [ ] URL-encoded text load/save (gzip + base64url) round-trips losslessly.
- [ ] Protocol-aware persistence: `#alchemist-state` mirror everywhere; `localStorage` mirror on `https://` only; nothing on `file://`.
- [ ] `beforeunload` dirty-state protection on `file://` (no alert on web URLs in normal mode).
- [ ] Boot sequence respects the priority in §7.6 (Phase 2 selection dialog excluded).
- [ ] Top-of-page error banner for load failures (used by `?data=`/`?gist=` in Phase 2; reusable).
- [ ] RPC URL config bar (stored, not consumed).
- [ ] Color-blind-friendly palette validated (no red/green-only distinctions).
- [ ] Boots and runs full feature set on both Chrome and Safari desktop.
- [ ] Unit tests for `src/lib/ckb/` matching Rust output byte-for-byte (Vitest, runs in Node).
- [ ] Unit tests for the engine (topological eval, error propagation) and persistence codec.
- [ ] CI passing (`lint`, `typecheck`, `test`, `build`). Visual / E2E testing is manual for now.
