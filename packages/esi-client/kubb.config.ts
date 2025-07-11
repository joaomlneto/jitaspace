import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";

export default defineConfig(({ config, watch, logLevel }) => {
  return {
    name: "esi-client",
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
      pluginOas({ validate: true }),
      pluginClient({
        importPath: "../../client",
        baseURL: "https://esi.evetech.net",
        dataReturnType: "full",
      }),
      pluginTs({}),
      pluginReactQuery({
        client: {
          importPath: "../../clientx",
          baseURL: "https://esi.evetech.net",
          dataReturnType: "full",
        },
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
            pattern: "^/corporations/{corporation_id}/assets/$",
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
      pluginZod({}),
    ],
  };
});
