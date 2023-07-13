import { defineConfig } from "orval";

export default defineConfig({
  esi_latest: {
    output: {
      mode: "tags",
      target: "./generated/",
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
      target: "https://esi.evetech.net/swagger.json",
    },
    hooks: {
      //afterAllFilesWrite: "prettier --write",
    },
  },
});
