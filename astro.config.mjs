// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import svelte from "@astrojs/svelte";

/** @type {import('vite').Plugin} */
const svelteFullReload = {
  name: "svelte-full-reload",
  enforce: "post",
  handleHotUpdate({ file, server }) {
    if (file.endsWith(".svelte")) {
      server.ws.send({ type: "full-reload" });
      return [];
    }
  },
};

// https://astro.build/config
export default defineConfig({
  integrations: [svelte()],
  output: "server",
  adapter: node({ mode: "standalone" }),
  vite: {
    plugins: [svelteFullReload],
  },
});
