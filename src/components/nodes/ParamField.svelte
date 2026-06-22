<script lang="ts">
  import type { ParamField as ParamFieldT } from "$lib/nodes";
  import type { HashTypeParam } from "$lib/nodes/specs/script-assembler";

  let {
    field,
    value,
    onupdate,
  }: {
    field: ParamFieldT;
    value: unknown;
    onupdate: (v: unknown) => void;
  } = $props();

  function textValue(v: unknown): string {
    return typeof v === "string" ? v : "";
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="al-field nodrag" onpointerdown={(e) => e.stopPropagation()}>
  <span class="al-field__label">{field.label}</span>

  {#if field.kind === "text"}
    {#if field.multiline}
      <textarea
        class="al-input al-input--mono"
        rows="2"
        placeholder={field.placeholder ?? ""}
        value={textValue(value)}
        oninput={(e) => onupdate(e.currentTarget.value)}
      ></textarea>
    {:else}
      <input
        class="al-input al-input--mono"
        type="text"
        placeholder={field.placeholder ?? ""}
        value={textValue(value)}
        oninput={(e) => onupdate(e.currentTarget.value)}
      />
    {/if}
  {:else if field.kind === "number"}
    <input
      class="al-input"
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      placeholder={field.placeholder ?? ""}
      value={textValue(value)}
      oninput={(e) => onupdate(e.currentTarget.value)}
    />
  {:else if field.kind === "select"}
    <select
      class="al-input"
      value={textValue(value)}
      onchange={(e) => onupdate(e.currentTarget.value)}
    >
      {#each field.options as opt (opt.value)}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  {:else if field.kind === "hashType"}
    {@const ht = (value ?? { kind: "Data" }) as HashTypeParam}
    <div class="al-ht">
      <div class="al-ht__variants">
        {#each ["Data", "Type", "Data1", "DataN"] as variant (variant)}
          <label class="al-ht__variant">
            <input
              type="radio"
              name="{field.key}-variant"
              value={variant}
              checked={ht.kind === variant}
              onchange={() => {
                if (variant === "DataN") {
                  onupdate({
                    kind: "DataN",
                    n: String(ht.kind === "DataN" ? ht.n : "1"),
                  });
                } else {
                  onupdate({ kind: variant });
                }
              }}
            />
            {variant}
          </label>
        {/each}
      </div>
      {#if ht.kind === "DataN"}
        <input
          class="al-input al-input--n"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          placeholder="1"
          value={ht.n}
          oninput={(e) => onupdate({ kind: "DataN", n: e.currentTarget.value })}
        />
      {/if}
    </div>
  {/if}
</div>

<style>
  .al-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .al-field__label {
    font-size: 10px;
    color: #6a6e77;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .al-input {
    width: 100%;
    background: #0f1115;
    border: 1px solid #2a2e37;
    border-radius: 4px;
    color: #e6e6e6;
    padding: 3px 6px;
    font-size: 12px;
    outline: none;
  }
  .al-input:focus {
    border-color: #7c5cff;
  }
  .al-input--mono {
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
  }
  .al-input--n {
    width: 80px;
    margin-top: 4px;
  }
  textarea.al-input {
    resize: vertical;
    word-break: break-all;
  }
  .al-ht__variants {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .al-ht__variant {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    cursor: pointer;
  }
</style>
