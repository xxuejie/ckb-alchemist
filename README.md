# CKB Alchemist

A visual, node-based builder for CKB transactions. The graph _is_ the source of truth: nodes produce typed outputs, edges carry them to consumers, and the assembled canvas compiles down to a CKB transaction.

Built with **Svelte 5 + Svelte Flow + Vite + TypeScript + Tailwind**. Production builds emit a single self-contained `index.html` (modeled on [Tiddlywiki](https://tiddlywiki.com/)) that works offline from `file://` or any static host.

## Quick start

```bash
pnpm install
pnpm dev          # local dev server (http://localhost:5173)
pnpm dev:host     # dev server accessible on the LAN
pnpm build        # single-file production build → dist/index.html
pnpm test         # run vitest
pnpm check        # lint + typecheck + test + build (via check.sh)
```

## Architecture

See [`PLAN.md`](./PLAN.md) for the full design document.

- **`src/lib/ckb/`** — Pure TS domain layer (hex, blake2b, Script molecule serialization) wrapping `@ckb-ccc/core`.
- **`src/lib/nodes/`** — Declarative node-spec registry. Each spec declares typed inputs, a single typed output, param schema, and a pure `evaluate` function.
- **`src/lib/engine/`** — Topological evaluation over the Svelte Flow graph with cycle detection and type-checking connection validation.
- **`src/lib/persistence/`** — Tiddlywiki-style persistence: in-DOM `#alchemist-state` mirror, protocol-aware `localStorage`, Save HTML, gzip+base64url text codec.
- **`src/components/`** — Svelte Flow canvas, generic node component, custom edges, panels (top bar, palette, inspector).

## License

MIT
