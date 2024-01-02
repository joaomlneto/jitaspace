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
      path: "http://sde.jita.space/latest/swagger.json",
    },
    output: {
      path: "./src/generated",
    },
    plugins: [
      createSwagger({}),
      createSwaggerClient({
        client: {
          importPath: "../../client",
        },
        dataReturnType: "full",
      }),
      createSwaggerTS({}),
      createSwaggerTanstackQuery({
        client: {
          importPath: "../../client",
        },
        dataReturnType: "full",
      }),
      createSwaggerZod({}),
      createSwaggerZodios({}),
    ],
  };
});
