import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";

export default defineConfig(async () => {
  return {
    name: "sde-client",
    root: ".",
    input: {
      path: "http://sde.jita.space/20260219/swagger.json",
    },
    output: {
      path: "./src/generated",
    },
    plugins: [
      pluginOas({ validate: true }),
      pluginClient({
        //importPath: "../../client",
        baseURL: "https://sde.jita.space/20260219",
        dataReturnType: "full",
      }),
      pluginTs({}),
      pluginReactQuery({
        client: {
          //importPath: "../../client",
          baseURL: "https://sde.jita.space/20260219",
          dataReturnType: "full",
        },
      }),
      pluginZod({}),
    ],
  };
});
