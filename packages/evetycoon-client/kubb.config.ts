import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";

export default defineConfig(async () => {
  return {
    name: "evetycoon-client",
    root: ".",
    input: {
      path: "./swagger.json",
    },
    output: {
      path: "./src/generated",
    },
    plugins: [
      pluginOas({ validate: true }),
      pluginClient({
        //importPath: "../../client",
        baseURL: "https://evetycoon.com/api",
        dataReturnType: "full",
      }),
      pluginTs({}),
      pluginReactQuery({
        client: {
          //importPath: "../../client",
          baseURL: "https://evetycoon.com/api",
          dataReturnType: "full",
        },
      }),
      pluginZod({}),
    ],
  };
});
