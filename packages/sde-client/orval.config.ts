import { defineConfig } from "orval";

export default defineConfig({
  esi_latest: {
    output: {
      mode: "single",
      target: "./generated/sde.ts",
      schemas: "./generated/models",
      client: "react-query",
      override: {
        mutator: {
          path: "./utils/use-custom-client.ts",
          name: "useCustomClient",
        },
      },
    },
    input: {
      target: "https://sde.jita.space/latest/swagger.json",
    },
    hooks: {
      //afterAllFilesWrite: "prettier --write",
    },
  },
});
