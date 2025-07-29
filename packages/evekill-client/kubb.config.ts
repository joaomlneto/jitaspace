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
      path: "https://eve-kill.com/_openapi.json",
    },
    output: {
      path: "./src/generated",
    },
    plugins: [
      pluginOas({ validate: true }),
      pluginClient({
        //importPath: "../../client",
        dataReturnType: "full",
      }),
      pluginTs({}),
      pluginReactQuery({
        client: {
          //importPath: "../../client",
          dataReturnType: "full",
        },
      }),
      pluginZod({}),
    ],
  };
});
