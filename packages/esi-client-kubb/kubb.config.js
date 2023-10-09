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
      path: "./swagger.json",
      //path: "https://esi.evetech.net/latest/swagger.json",
    },
    output: {
      path: "./src",
    },
    plugins: [
      createSwagger({}),
      createSwaggerClient({
        //output: "./clients/axios",
      }),
      createSwaggerTS({}),
      createSwaggerTanstackQuery({
        //client: "./src/client",
        infinite: {},
        dataReturnType: "full",
      }),
      createSwaggerZod({}),
      createSwaggerZodios({}),
    ],
  };
});
