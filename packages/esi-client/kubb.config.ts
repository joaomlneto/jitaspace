import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";

// Endpoints exposing an infinite query: [pathPattern, paginationParam, initialPageParam].
// FIXME: initialPageParam 0 (from_event / last_mail_id) is not valid and must be
// overridden when consuming the generated hook.
const infiniteEndpoints: [
  pattern: string,
  queryParam: string,
  initialPageParam: number,
][] = [
  ["^/characters/{character_id}/calendar/?$", "from_event", 0],
  ["^/characters/{character_id}/assets/?$", "page", 1],
  ["^/corporations/{corporation_id}/assets/?$", "page", 1],
  ["^/alliances/{alliance_id}/contacts/?$", "page", 1],
  ["^/characters/{character_id}/contacts/?$", "page", 1],
  ["^/corporations/{corporation_id}/contacts/?$", "page", 1],
  ["^/characters/{character_id}/mail/?$", "last_mail_id", 0],
];

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
      // enumTypeSuffix: "" preserves v3 enum type names (`...Enum`); kubb v4
      // defaults this to "Key", which would rename every generated enum type.
      pluginTs({ enumTypeSuffix: "" }),
      pluginReactQuery({
        client: {
          importPath: "../../client",
          baseURL: "https://esi.evetech.net",
          dataReturnType: "full",
        },
        override: infiniteEndpoints.map(
          ([pattern, queryParam, initialPageParam]) => ({
            type: "path" as const,
            pattern,
            options: { infinite: { queryParam, initialPageParam } },
          }),
        ),
      }),
      pluginZod({}),
    ],
  };
});
