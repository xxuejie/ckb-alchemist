type Theme = "dark" | "light";

const LS_KEY = "ckb-alchemist:theme";

function detectInitial(): Theme {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === "light" || saved === "dark") return saved;
  }
  return "dark";
}

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", theme === "light");
}

const state = $state({ theme: detectInitial() });

apply(state.theme);

export const theme = {
  get current(): Theme {
    return state.theme;
  },
  toggle() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    apply(state.theme);
    try {
      localStorage.setItem(LS_KEY, state.theme);
    } catch {
      // localStorage unavailable — in-memory only
    }
  },
};
