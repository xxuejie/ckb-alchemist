import { describe, it, expect } from "vitest";
import {
  decodeHex,
  isValidHex,
  normalizeHex,
  ckbHash,
  hashTypeToByte,
  serializeScriptBytes,
  serializeScriptHex,
  parseCodeHash,
  type ScriptHashType,
} from "$lib/ckb";
import { Script as CccScript, bytesFrom } from "@ckb-ccc/core";

describe("decodeHex", () => {
  it("strips 0x prefix and decodes", () => {
    expect(Array.from(decodeHex("0xdeadbeef"))).toEqual([0xde, 0xad, 0xbe, 0xef]);
    expect(Array.from(decodeHex("DEADBEEF"))).toEqual([0xde, 0xad, 0xbe, 0xef]);
    expect(Array.from(decodeHex(""))).toEqual([]);
    expect(Array.from(decodeHex("0x"))).toEqual([]);
  });

  it("rejects odd-length input", () => {
    expect(() => decodeHex("0xabc")).toThrow(
      /Error parsing hex content: Odd number of digits/,
    );
  });

  it("rejects non-hex characters", () => {
    expect(() => decodeHex("0xzz")).toThrow(
      /Error parsing hex content: Invalid character/,
    );
  });
});

describe("isValidHex / normalizeHex", () => {
  it("accepts valid hex of either case with or without 0x", () => {
    expect(isValidHex("0xdeadbeef")).toBe(true);
    expect(isValidHex("deadbeef")).toBe(true);
    expect(isValidHex("0x")).toBe(true);
    expect(isValidHex("")).toBe(true);
    expect(isValidHex("0xnope")).toBe(false);
    expect(isValidHex("abc")).toBe(false);
  });

  it("normalizes to lowercase 0x-prefixed form", () => {
    expect(normalizeHex("DEADBEEF")).toBe("0xdeadbeef");
    expect(normalizeHex("0XDEADBEEF")).toBe("0xdeadbeef");
    expect(normalizeHex("")).toBe("0x");
    expect(normalizeHex("0xnope")).toBe("0x");
    expect(normalizeHex(bytesFrom([0xde, 0xad]))).toBe("0xdead");
  });
});

describe("ckbHash", () => {
  it("produces a 32-byte hash in 0x-prefixed lowercase hex", () => {
    const h = ckbHash("");
    expect(h.startsWith("0x")).toBe(true);
    expect(h.length).toBe(66); // 0x + 64 hex chars
    expect(h).toBe(h.toLowerCase());
  });

  it("hashes empty bytes deterministically", () => {
    expect(ckbHash("")).toBe(ckbHash("0x"));
    expect(ckbHash("")).toBe(ckbHash(bytesFrom([])));
  });

  it("produces a stable 32-byte digest for arbitrary input", () => {
    const h = ckbHash("0xdeadbeefcafebabe");
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe("hashTypeToByte", () => {
  it("encodes named variants to canonical bytes", () => {
    expect(hashTypeToByte({ kind: "Data" })).toBe(0);
    expect(hashTypeToByte({ kind: "Type" })).toBe(1);
    expect(hashTypeToByte({ kind: "Data1" })).toBe(2);
  });

  it("encodes DataN as n << 1", () => {
    expect(hashTypeToByte({ kind: "DataN", n: 1 })).toBe(2); // same wire as Data1
    expect(hashTypeToByte({ kind: "DataN", n: 2 })).toBe(4); // same wire as Data2
    expect(hashTypeToByte({ kind: "DataN", n: 127 })).toBe(254);
  });

  it("rejects n > 127 with the Rust message", () => {
    expect(() => hashTypeToByte({ kind: "DataN", n: 128 })).toThrow(
      /It is not possible to build data version 128!/,
    );
  });
});

describe("Script serialization", () => {
  const codeHash32 = "0x" + "ab".repeat(32);

  it("matches CCC byte-for-byte for Data / Type / Data1 / Data2", () => {
    const cases: Array<{
      ours: ScriptHashType;
      ccc: "data" | "type" | "data1" | "data2";
    }> = [
      { ours: { kind: "Data" }, ccc: "data" },
      { ours: { kind: "Type" }, ccc: "type" },
      { ours: { kind: "Data1" }, ccc: "data1" },
      { ours: { kind: "DataN", n: 2 }, ccc: "data2" },
    ];
    for (const { ours, ccc } of cases) {
      const oursBytes = serializeScriptBytes({
        codeHash: codeHash32,
        hashType: ours,
        args: "0x" as `0x${string}`,
      });
      const cccBytes = new CccScript(
        codeHash32 as `0x${string}`,
        ccc,
        "0x" as `0x${string}`,
      ).toBytes();
      expect(Array.from(oursBytes)).toEqual(Array.from(cccBytes));
    }
  });

  it("matches CCC byte-for-byte with non-empty args", () => {
    const ours = serializeScriptBytes({
      codeHash: codeHash32,
      hashType: { kind: "Type" },
      args: "0xdeadbeefcafebabe" as `0x${string}`,
    });
    const ccc = new CccScript(
      codeHash32 as `0x${string}`,
      "type",
      "0xdeadbeefcafebabe" as `0x${string}`,
    ).toBytes();
    expect(Array.from(ours)).toEqual(Array.from(ccc));
  });

  it("produces 0x-prefixed lowercase hex", () => {
    const hex = serializeScriptHex({
      codeHash: codeHash32,
      hashType: { kind: "Data" },
      args: "0x",
    });
    expect(hex.startsWith("0x")).toBe(true);
    expect(hex).toBe(hex.toLowerCase());
    // 53 bytes -> 106 hex chars + 2 for 0x = 108
    expect(hex.length).toBe(108);
  });

  it("handles non-empty args", () => {
    const hex = serializeScriptHex({
      codeHash: codeHash32,
      hashType: { kind: "Type" },
      args: "0xdeadbeef",
    });
    // args = 4 bytes -> Bytes field = 4 (size header) + 4 (data) = 8 bytes; total 53 + 4 = 57
    expect(hex.length).toBe(2 + 57 * 2);
  });

  it("serializes DataN through the same table layout", () => {
    const ours = serializeScriptBytes({
      codeHash: codeHash32,
      hashType: { kind: "DataN", n: 5 },
      args: "0x",
    });
    // hashType byte at offset 16 + 32 = 48, value = 5 << 1 = 10
    expect(ours[48]).toBe(10);
  });
});

describe("parseCodeHash", () => {
  it("accepts a 32-byte hex value", () => {
    const valid = "0x" + "ab".repeat(32);
    expect(parseCodeHash(valid).byteLength).toBe(32);
    expect(parseCodeHash("ab".repeat(32)).byteLength).toBe(32);
  });

  it("rejects wrong length with the Rust message", () => {
    expect(() => parseCodeHash("0xdeadbeef")).toThrow(
      /Error parsing code hash: Invalid length/,
    );
  });

  it("rejects non-hex with the Rust message", () => {
    const bad = "0x" + "zz".repeat(32);
    expect(() => parseCodeHash(bad)).toThrow(/Error parsing code hash:/);
  });
});
