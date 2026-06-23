import type { NodeSpec } from "../spec";

export const NoteSpec: NodeSpec = {
  type: "note",
  label: "Note",
  description: "Text annotation for the canvas.",
  category: "Note",
  inputs: [],
  params: [
    {
      kind: "text",
      key: "text",
      label: "Note",
      multiline: true,
      placeholder: "Type a note…",
    },
  ],
  defaultParams: { text: "" },
  evaluate: (_inputs, params) => {
    const text = (params.text as string) ?? "";
    return { ok: true, value: { type: "Number", value: 0 }, info: text };
  },
};
