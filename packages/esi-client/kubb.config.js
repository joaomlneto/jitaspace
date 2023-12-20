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
      // Cannot use the spec directly, as the parser cannot parse the routes endpoint.
      // We remove it using jq (see package.json scripts) before feeding it into kubb.
      //path: "https://esi.evetech.net/latest/swagger.json",
      path: "./swagger.json",
    },
    output: {
      path: "./src/generated",
    },
    plugins: [
      createSwagger({}),
      createSwaggerClient({
        client: {
          importPath: "./src/client.ts",
        },
        dataReturnType: "full",
      }),
      createSwaggerTS({}),
      createSwaggerTanstackQuery({
        client: {
          importPath: "./src/client.ts",
        },
        dataReturnType: "full",
        infinite: {},
      }),
      createSwaggerZod({}),
      createSwaggerZodios({}),
    ],
  };
});
