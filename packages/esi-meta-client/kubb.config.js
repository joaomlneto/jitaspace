import { defineConfig } from "@kubb/core";
import createSwagger from "@kubb/swagger";
import createSwaggerClient from "@kubb/swagger-client";
import createSwaggerTanstackQuery from "@kubb/swagger-tanstack-query";
import createSwaggerTS from "@kubb/swagger-ts";
import createSwaggerZod from "@kubb/swagger-zod";
import createSwaggerZodios from "@kubb/swagger-zodios";

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
      }),
      createSwaggerZod({
        skipBy: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" },
        ],
      }),
      createSwaggerZodios({}),
    ],
  };
});
