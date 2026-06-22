import type { Client } from "@ckb-ccc/core";

/** Default RPC URL — testnet. User-configurable; not consumed in Phase 1. */
export const DEFAULT_RPC_URL = "https://testnet.ckbapp.dev/";

const state = $state({
  url: DEFAULT_RPC_URL,
  client: null as Client | null,
  /** Set when the URL fails to construct a usable client. */
  error: null as string | null,
});

export const rpc = {
  get url(): string {
    return state.url;
  },
  get client(): Client | null {
    return state.client;
  },
  get error(): string | null {
    return state.error;
  },

  /** Updates the URL and (re)constructs the CCC client lazily. */
  setUrl(url: string) {
    state.url = url;
    // Phase 1: we don't actually exercise the client. Construction is deferred
    // to Phase 3. We just validate that the URL is well-formed.
    state.error = null;
    try {
      // Light validation: throws on syntactically bad URLs.
      new URL(url);
    } catch (e) {
      state.error = (e as Error).message;
    }
  },
};
