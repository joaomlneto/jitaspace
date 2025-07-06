import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";

export default defineConfig(async () => {
  return {
    name: "esi-meta-client",
    root: ".",
    input: {
      path: "https://esi.evetech.net/swagger.json",
    },
    output: {
      path: "./src/generated",
    },
    plugins: [
      pluginOas({ validate: true }),
      pluginClient({
        //importPath: "../../client",
        baseURL: "https://esi.evetech.net",
        dataReturnType: "full",
        exclude: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" },
        ],
      }),
      pluginTs({
        exclude: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" },
        ],
      }),
      pluginReactQuery({
        client: {
          //importPath: "../../client",
          baseURL: "https://esi.evetech.net",
          dataReturnType: "full",
        },
        exclude: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" },
        ],
      }),
      pluginZod({
        exclude: [
          { type: "tag", pattern: "Swagger" },
          { type: "tag", pattern: "WebUI" },
        ],
      }),
    ],
  };
});
