import { describe, it, expect } from "vitest";
import { Script, Address } from "@ckb-ccc/core";
import { serializeScriptHex } from "$lib/ckb";
import { asHex, type Value } from "$lib/nodes/types";
import { CellSpec } from "$lib/nodes/specs/cell";
import { TransactionSpec } from "$lib/nodes/specs/transaction";
import { OutPointSpec } from "$lib/nodes/specs/out-point";
import { CellDepSpec } from "$lib/nodes/specs/ckb-structs";
import { WitnessArgsSpec } from "$lib/nodes/specs/ckb-structs";
import { AddressSpec } from "$lib/nodes/specs/address";
import { KnownScriptSpec } from "$lib/nodes/specs/known-script";
import { SinceSpec } from "$lib/nodes/specs/since";
import { ToUint64Spec, FromUint64Spec } from "$lib/nodes/specs/uint64";
import {
  StringToHexSpec,
  HexToStringSpec,
  ReverseBytesSpec,
} from "$lib/nodes/specs/conversion";
import { NumberInputSpec, ConditionalSpec } from "$lib/nodes/specs/utility";
import { SignerSpec } from "$lib/nodes/specs/signer";

const codeHash32 = "0x" + "ab".repeat(32);
const lockScript = serializeScriptHex({
  codeHash: codeHash32,
  hashType: { kind: "Type" },
  args: "0x",
});

function makeScriptValue(hex: string): Value {
  return { type: "Bytes", hex: hex as `0x${string}` };
}

describe("Cell node", () => {
  it("computes occupied size and validates capacity", () => {
    const result = CellSpec.evaluate(
      { lock: makeScriptValue(lockScript) },
      { capacity: "61" },
    );
    // Script occupied: 33 (32 codeHash + 1 hashType + 0 args)
    // CellOutput occupied: 8 + 33 = 41
    // Cell occupied: 41 + 0 data = 41
    // Min capacity: 41 CKB
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.info).toContain("✓");
      expect(result.info).toContain("min 41");
    }
  });

  it("rejects insufficient capacity", () => {
    const result = CellSpec.evaluate(
      { lock: makeScriptValue(lockScript) },
      { capacity: "40" },
    );
    expect(result.ok).toBe(false);
  });

  it("includes data length in occupied size", () => {
    const result = CellSpec.evaluate(
      {
        lock: makeScriptValue(lockScript),
        data: makeScriptValue("0xdeadbeef"),
      },
      { capacity: "45" },
    );
    // 41 (output) + 4 (data) = 45 bytes → min 45 CKB
    expect(result.ok).toBe(true);
  });

  it("decodes from molecule input", () => {
    const result = CellSpec.evaluate({ molecule: makeScriptValue(lockScript) }, {});
    expect(result.ok).toBe(false); // lockScript is a Script, not CellOutput
  });
});

describe("Transaction node", () => {
  it("assembles from cell outputs and outpoints", () => {
    const cellOut = CellSpec.evaluate(
      { lock: makeScriptValue(lockScript) },
      { capacity: "100" },
    );
    expect(cellOut.ok).toBe(true);

    const opResult = OutPointSpec.evaluate(
      {},
      {
        txHash: codeHash32,
        index: "0",
      },
    );
    expect(opResult.ok).toBe(true);

    const txResult = TransactionSpec.evaluate(
      {
        outputs: [cellOut.ok ? cellOut.value : undefined] as Value[],
        inputs: [opResult.ok ? opResult.value : undefined] as Value[],
      },
      { headerDeps: "" },
    );
    expect(txResult.ok).toBe(true);
    if (txResult.ok) {
      expect(txResult.info).toContain("1 output(s)");
      expect(txResult.info).toContain("1 input(s)");
      expect(txResult.info).toContain("tx hash:");
    }
  });

  it("handles empty transaction", () => {
    const result = TransactionSpec.evaluate({}, { headerDeps: "" });
    expect(result.ok).toBe(true);
  });

  it("accepts cell deps", () => {
    const opResult = OutPointSpec.evaluate({}, { txHash: codeHash32, index: "1" });
    expect(opResult.ok).toBe(true);
    const depResult = CellDepSpec.evaluate(
      { outPoint: opResult.ok ? opResult.value : undefined },
      { depType: "code" },
    );
    expect(depResult.ok).toBe(true);

    const txResult = TransactionSpec.evaluate(
      { cellDeps: [depResult.ok ? depResult.value : undefined] as Value[] },
      { headerDeps: "" },
    );
    expect(txResult.ok).toBe(true);
    if (txResult.ok) {
      expect(txResult.info).toContain("1 cell dep(s)");
    }
  });
});

describe("OutPoint node", () => {
  it("serializes a valid OutPoint", () => {
    const result = OutPointSpec.evaluate({}, { txHash: codeHash32, index: "5" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // OutPoint = struct { txHash: Byte32, index: Uint32 } = 36 bytes = 72 hex chars + 0x
      expect(asHex(result.value)?.length).toBe(2 + 72);
    }
  });

  it("rejects wrong-length tx hash", () => {
    const result = OutPointSpec.evaluate({}, { txHash: "0xdeadbeef", index: "0" });
    expect(result.ok).toBe(false);
  });
});

describe("WitnessArgs node", () => {
  it("builds from optional inputs", () => {
    const result = WitnessArgsSpec.evaluate({ lock: makeScriptValue("0xabcd") }, {});
    expect(result.ok).toBe(true);
  });

  it("builds empty witness", () => {
    const result = WitnessArgsSpec.evaluate({}, {});
    expect(result.ok).toBe(true);
  });
});

describe("CellDep node", () => {
  it("builds from OutPoint", () => {
    const opResult = OutPointSpec.evaluate({}, { txHash: codeHash32, index: "0" });
    const result = CellDepSpec.evaluate(
      { outPoint: opResult.ok ? opResult.value : undefined },
      { depType: "depGroup" },
    );
    expect(result.ok).toBe(true);
  });
});

describe("Address node", () => {
  it("parses a Full-format testnet address", () => {
    // Generate a valid Full-format address using CCC
    const testScript = new Script(
      ("0x" + "ab".repeat(32)) as `0x${string}`,
      "type",
      "0x1234" as `0x${string}`,
    );
    const addr = new Address(testScript, "ckt").toString();

    const result = AddressSpec.evaluate({}, { address: addr });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(asHex(result.value)?.startsWith("0x")).toBe(true);
    }
  });

  it("rejects empty input", () => {
    const result = AddressSpec.evaluate({}, { address: "" });
    expect(result.ok).toBe(false);
  });
});

describe("KnownScript node", () => {
  it("produces secp256k1 script with args", () => {
    const result = KnownScriptSpec.evaluate(
      {},
      { script: "secp256k1-blake160", args: "0x" + "00".repeat(20) },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.info).toContain("Secp256k1");
    }
  });
});

describe("Since node", () => {
  it("encodes absolute block number", () => {
    const result = SinceSpec.evaluate(
      {},
      { relative: "absolute", metric: "blockNumber", value: "1000" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Since is Uint64 LE = 8 bytes
      expect(asHex(result.value)?.length).toBe(2 + 16);
    }
  });
});

describe("Uint64 nodes", () => {
  it("encodes number to 8-byte LE", () => {
    const result = ToUint64Spec.evaluate({}, { value: "100000000" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(asHex(result.value)?.length).toBe(2 + 16);
    }
  });

  it("decodes 8-byte LE to number", () => {
    const encoded = ToUint64Spec.evaluate({}, { value: "42" });
    expect(encoded.ok).toBe(true);
    if (encoded.ok) {
      const decoded = FromUint64Spec.evaluate({ input: encoded.value }, {});
      expect(decoded.ok).toBe(true);
      if (decoded.ok && decoded.value.type === "Number") {
        expect(decoded.value.value).toBe(42);
      }
    }
  });
});

describe("Conversion nodes", () => {
  it("StringToHex encodes UTF-8", () => {
    const result = StringToHexSpec.evaluate({}, { text: "Hi" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(asHex(result.value)).toBe("0x4869");
    }
  });

  it("HexToString decodes UTF-8", () => {
    const result = HexToStringSpec.evaluate({ input: makeScriptValue("0x4869") }, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.info).toContain('"Hi"');
    }
  });

  it("ReverseBytes swaps order", () => {
    const result = ReverseBytesSpec.evaluate({ input: makeScriptValue("0x0102") }, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(asHex(result.value)).toBe("0x0201");
    }
  });
});

describe("Conditional node", () => {
  it("selects A when pred is non-zero", () => {
    const result = ConditionalSpec.evaluate(
      {
        pred: { type: "Number", value: 1 },
        a: makeScriptValue("0xaa"),
        b: makeScriptValue("0xbb"),
      },
      {},
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(asHex(result.value)).toBe("0xaa");
      expect(result.info).toContain("a");
    }
  });

  it("selects B when pred is zero", () => {
    const result = ConditionalSpec.evaluate(
      {
        pred: { type: "Number", value: 0 },
        a: makeScriptValue("0xaa"),
        b: makeScriptValue("0xbb"),
      },
      {},
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(asHex(result.value)).toBe("0xbb");
      expect(result.info).toContain("b");
    }
  });
});

describe("NumberInput node", () => {
  it("outputs a Number value", () => {
    const result = NumberInputSpec.evaluate({}, { value: "42" });
    expect(result.ok).toBe(true);
    if (result.ok && result.value.type === "Number") {
      expect(result.value.value).toBe(42);
    }
  });
});

describe("Signer node", () => {
  // Deterministic test key (RFC 6979 makes signatures deterministic)
  const testKey = "0x" + "01".repeat(32);
  const testMessage = "0xdeadbeef";

  it("produces a 65-byte signature", () => {
    const result = SignerSpec.evaluate(
      { message: makeScriptValue(testMessage) },
      { privateKey: testKey },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // r(32) + s(32) + recovery(1) = 65 bytes = 130 hex chars + 0x
      expect(asHex(result.value)?.length).toBe(2 + 130);
    }
  });

  it("shows derived lock arg in info", () => {
    const result = SignerSpec.evaluate(
      { message: makeScriptValue(testMessage) },
      { privateKey: testKey },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.info).toContain("lock arg:");
    }
  });

  it("rejects invalid private key length", () => {
    const result = SignerSpec.evaluate(
      { message: makeScriptValue(testMessage) },
      { privateKey: "0xdeadbeef" },
    );
    expect(result.ok).toBe(false);
  });

  it("produces deterministic signatures (same key + message = same sig)", () => {
    const r1 = SignerSpec.evaluate(
      { message: makeScriptValue(testMessage) },
      { privateKey: testKey },
    );
    const r2 = SignerSpec.evaluate(
      { message: makeScriptValue(testMessage) },
      { privateKey: testKey },
    );
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(asHex(r1.value)).toBe(asHex(r2.value));
    }
  });
});
