import {
  bytesFrom,
  bytesTo,
  numFromBytes,
  fixedPointFrom,
  fixedPointToString,
} from "@ckb-ccc/core";
import { asHex, singleValue } from "../types";
import type { NodeSpec } from "../spec";

/** Extract the DAO AR (accumulated rate) value from a JSON-encoded header. */
function extractDaoAr(headerHex: string): bigint {
  const json = bytesTo(bytesFrom(headerHex), "utf8");
  const hdr = JSON.parse(json) as { dao: string };
  const daoBytes = bytesFrom(hdr.dao);
  // DAO layout: [c: 8 bytes LE, ar: 8 bytes LE, s: 8 bytes LE, u: 8 bytes LE]
  return numFromBytes(daoBytes.slice(8, 16));
}

export const DaoCalculatorSpec: NodeSpec = {
  type: "dao-calculator",
  label: "DAO Calculator",
  description: "Compute Nervos DAO profit from deposit and withdraw headers.",
  category: "CKB",
  inputs: [
    { id: "depositHeader", label: "deposit_header", type: "Bytes" },
    { id: "withdrawHeader", label: "withdraw_header", type: "Bytes" },
  ],
  output: { id: "out", label: "Profit (CKB)", type: "Number" },
  params: [
    {
      kind: "text",
      key: "capacity",
      label: "Capacity (CKB)",
      mono: true,
      placeholder: "e.g. 100",
    },
  ],
  defaultParams: { capacity: "0" },
  evaluate: (inputs, params) => {
    const depositVal = singleValue(inputs.depositHeader);
    const withdrawVal = singleValue(inputs.withdrawHeader);
    if (!depositVal) return { ok: false, error: "deposit_header is not connected" };
    if (!withdrawVal) return { ok: false, error: "withdraw_header is not connected" };

    const depositHex = asHex(depositVal);
    const withdrawHex = asHex(withdrawVal);
    if (depositHex === undefined || withdrawHex === undefined) {
      return { ok: false, error: "headers must carry bytes" };
    }

    try {
      const depositAr = extractDaoAr(depositHex);
      const withdrawAr = extractDaoAr(withdrawHex);

      // DAO profit: capacity * (withdrawAr - depositAr) / depositAr
      const capacityStr = (params.capacity as string) ?? "0";
      const capacity = fixedPointFrom(capacityStr);

      if (depositAr === 0n) {
        return { ok: false, error: "Deposit header AR is zero" };
      }
      const profit = (capacity * (withdrawAr - depositAr)) / depositAr;
      const profitCkb = fixedPointToString(profit);

      return {
        ok: true,
        value: { type: "Number", value: Number(profitCkb) },
        info: `profit: ${profitCkb} CKB`,
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
