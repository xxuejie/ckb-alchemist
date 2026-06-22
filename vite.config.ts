/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
      $components: path.resolve("./src/components"),
    },
  },
  server: {
    host: true,
    allowedHosts: true,
  },
  build: {
    target: "esnext",
    outDir: "dist",
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
  },
});
