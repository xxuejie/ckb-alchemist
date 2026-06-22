#!/usr/bin/env bash
# CI-like checks for the web app. Mirrors the root check.sh pattern.
set -eux

pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
