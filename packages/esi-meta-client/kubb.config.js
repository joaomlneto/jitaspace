import { defineConfig } from "@kubb/core";
import createSwagger from "@kubb/swagger";
import createSwaggerClient from "@kubb/swagger-client";
import createSwaggerTanstackQuery from "@kubb/swagger-tanstack-query";
import createSwaggerTS from "@kubb/swagger-ts";

const skipBy = [
  { type: "tag", pattern: "Swagger" },
  { type: "tag", pattern: "WebUI" },
];

export default defineConfig(async () => {
  return {
    root: ".",
    input: {
      path: "https://esi.evetech.net/swagger.json",
    },
    output: {
      path: "./src/generated",
    },
    plugins: [
      createSwagger({}),
      createSwaggerClient({
        client: "./src/client.ts",
        dataReturnType: "full",
        skipBy: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" },
        ],
      }),
      createSwaggerTS({
        skipBy: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" },
        ],
      }),
      createSwaggerTanstackQuery({
        client: "./src/client.ts",
        dataReturnType: "full",
        skipBy: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" },
        ],
        //infinite: {},
      }),
      //createSwaggerZod({}),
      //createSwaggerZodios({}),
    ],
  };
});
