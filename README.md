# CKB Alchemist

A visual, node-based builder for CKB transactions. The graph is the source of truth: nodes produce typed outputs, edges carry them to consumers, and the canvas compiles into CKB data structures.

Production builds emit a **single self-contained `index.html`** that works offline from `file://` or any static host.

## Quick start

```bash
pnpm install
pnpm dev          # dev server (localhost:5173)
pnpm dev:host     # dev server on LAN (0.0.0.0)
pnpm build        # single-file build → dist/index.html
pnpm test         # 74 tests
./check.sh        # format + lint + typecheck + test + build
```

## Nodes

| Category | Widgets |
|---|---|
| **Conversion** | Address, String→Hex, Hex→String, To Uint64 LE, From Uint64 LE, Reverse Bytes |
| **Utility** | Hex Input, Number, Concat, Slice, Conditional |
| **CKB** | Script Assembler, CKB Hash, Cell, Header, WitnessArgs, CellDep, Since, Known Script, DAO Calculator, Signer |
| **Transaction** | Transaction, OutPoint |
| **Network** | RPC (get_transaction, get_live_cell, get_header, get_tip_header, get_header_by_number, get_cells, get_transactions) |
| **Other** | Note |

Script, Cell, and Transaction nodes accept a `decode` input to parse molecule-serialized bytes.

## Persistence

- **Save HTML** — downloads a self-contained file that rehydrates the same graph
- **Share URL** — `?data=<gzip+base64url>` for small workflows, `?gist=<id>` for large ones
- **localStorage** — auto-saved on web URLs (not used on `file://`)
- **Boot dialog** — when multiple sources exist, choose which to load

## Tech

Svelte 5 · Svelte Flow · Vite · TypeScript · Tailwind · @ckb-ccc/core · @noble/curves · dagre

## License

MIT
