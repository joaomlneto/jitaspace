import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";

export default defineConfig(({ config, watch, logLevel }) => {
  return {
    name: "esi-client",
    root: ".",
    input: {
      //path: "https://eve-kill.com/_openapi.json",
      path: "./swagger.json",
    },
    output: {
      path: "./src/generated",
    },
    plugins: [
      pluginOas({ validate: true }),
      pluginClient({
        baseURL: "https://eve-kill.com",
        //importPath: "../../client",
        dataReturnType: "full",
      }),
      // enumTypeSuffix: "" preserves v3 enum type names (`...Enum`); kubb v4
      // defaults this to "Key", which would rename every generated enum type.
      pluginTs({ enumTypeSuffix: "" }),
      /*pluginReactQuery({
        client: {
          baseURL: "https://eve-kill.com",
          //importPath: "../../client",
          dataReturnType: "full",
        },
      }),*/
      pluginZod({}),
    ],
  };
});
