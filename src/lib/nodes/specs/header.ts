import { bytesFrom, bytesTo, numFrom } from "@ckb-ccc/core";
import { asHex } from "../types";
import type { NodeSpec } from "../spec";

/**
 * Header — parses and displays a CKB block header. Receives JSON-encoded
 * header data (Bytes) from an RPC node, extracts all fields, and outputs
 * the block hash. Shows block number, epoch, and timestamp in the info bar.
 */

interface JsonRpcBlockHeader {
  version: string;
  compact_target: string;
  timestamp: string;
  number: string;
  epoch: string;
  parent_hash: string;
  transactions_root: string;
  proposals_hash: string;
  extra_hash: string;
  nonce: string;
  hash: string;
  dao: string;
}

/** Unpacks an epoch Uint64 hex into [number, index, length]. */
function unpackEpoch(epochHex: string): [number, number, number] {
  const val = numFrom(epochHex);
  const number = Number(val >> 32n);
  const index = Number((val >> 16n) & 0xffffn);
  const length = Number(val & 0xffffn);
  return [number, index, length];
}

function formatTimestamp(ts: string): string {
  const ms = Number(numFrom(ts));
  return new Date(ms).toISOString();
}

export const HeaderSpec: NodeSpec = {
  type: "header",
  label: "Header",
  description: "Parses and displays a CKB block header.",
  inputs: [{ id: "header", label: "header", type: "Bytes" }],
  output: { id: "hash", label: "Block Hash", type: "Hash" },
  params: [],
  defaultParams: {},
  evaluate: (inputs) => {
    const headerVal = inputs.header;
    if (!headerVal) return { ok: false, error: "header is not connected" };

    try {
      const hex = asHex(headerVal);
      if (hex === undefined) return { ok: false, error: "header must carry bytes" };

      // Decode hex → UTF-8 bytes → JSON
      const jsonStr = bytesTo(bytesFrom(hex), "utf8");
      const hdr = JSON.parse(jsonStr) as JsonRpcBlockHeader;

      const blockNumber = Number(numFrom(hdr.number));
      const [epochNum, epochIdx, epochLen] = unpackEpoch(hdr.epoch);
      const ts = formatTimestamp(hdr.timestamp);

      const info = [
        `block: #${blockNumber}`,
        `epoch: ${epochNum}.${epochIdx}/${epochLen}`,
        `time: ${ts}`,
        `parent: ${hdr.parent_hash.slice(0, 18)}…`,
      ].join("\n");

      return {
        ok: true,
        value: { type: "Hash", hex: hdr.hash as `0x${string}` },
        info,
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
