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
      createSwagger({ validate: true }),
      createSwaggerClient({
        client: {
          importPath: "../../client",
        },
        dataReturnType: "full",
      }),
      createSwaggerTS({}),
      createSwaggerTanstackQuery({
        framework: "react",
        client: {
          importPath: "../../client",
        },
        dataReturnType: "full",
        override: [
          {
            type: "path",
            pattern: "^/characters/{character_id}/calendar/$",
            options: {
              infinite: {
                queryParam: "from_event",
                // FIXME: This is not valid! Needs to be overriden when using the generated code!
                initialPageParam: 0,
              },
            },
          },
          {
            type: "path",
            pattern: "^/characters/{character_id}/assets/$",
            options: {
              infinite: {
                queryParam: "page",
                initialPageParam: 1,
              },
            },
          },
          {
            type: "path",
            pattern: "^/alliances/{alliance_id}/contacts/$",
            options: {
              infinite: {
                queryParam: "page",
                initialPageParam: 1,
              },
            },
          },
          {
            type: "path",
            pattern: "^/characters/{character_id}/contacts/$",
            options: {
              infinite: {
                queryParam: "page",
                initialPageParam: 1,
              },
            },
          },
          {
            type: "path",
            pattern: "^/corporations/{corporation_id}/contacts/$",
            options: {
              infinite: {
                queryParam: "page",
                initialPageParam: 1,
              },
            },
          },
          {
            type: "path",
            pattern: "^/characters/{character_id}/mail/$",
            options: {
              infinite: {
                queryParam: "last_mail_id",
                // FIXME: This is not valid! Needs to be overriden when using the generated code!
                initialPageParam: 0,
              },
            },
          },
        ],
      }),
      createSwaggerZod({}),
      createSwaggerZodios({}),
    ],
  };
});
