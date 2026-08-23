import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "hs7x8r",

  e2e: {
    // The CI workflow starts the app on this port before invoking Cypress.
    baseUrl: "http://localhost:3000",
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
