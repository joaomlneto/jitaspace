import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "hs7x8r",

  e2e: {
    setupNodeEvents(_on, _config) {
      // implement node event listeners here
    },
  },

  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
});
