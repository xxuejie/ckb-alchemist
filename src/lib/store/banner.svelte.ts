/**
 * Transient error banner state. Used by boot() to surface load failures
 * (PLAN §11: "Top-of-page error banner for load failures").
 */

export interface BannerMessage {
  id: number;
  text: string;
}

let nextId = 1;

const messages = $state<BannerMessage[]>([]);

export const banner = {
  get messages(): readonly BannerMessage[] {
    return messages;
  },
  show(text: string) {
    const id = nextId++;
    messages.push({ id, text });
    setTimeout(() => this.dismiss(id), 8000);
  },
  dismiss(id: number) {
    const idx = messages.findIndex((m) => m.id === id);
    if (idx >= 0) messages.splice(idx, 1);
  },
};
