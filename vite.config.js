import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/escrita-por-voz-web/" : "/",
  server: {
    open: false
  }
}));
