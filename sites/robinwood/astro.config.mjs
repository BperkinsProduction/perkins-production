// The concept is served at perkinsproduction.com/concepts/robinwood/ as plain files.
import { defineConfig } from "astro/config";
export default defineConfig({
  site: "https://www.perkinsproduction.com",
  base: "/concepts/robinwood",
  trailingSlash: "ignore",
  outDir: "./dist",
  compressHTML: false,
  build: { format: "directory", assets: "_astro", inlineStylesheets: "never" },
});
