import { readFileSync } from "node:fs";
import path from "node:path";
import { definePlugin } from "@kubb/core";

import type { EsiOperation, MultiEsiEndpoint } from "./multiEsiEndpoints";
import { describeEndpoint, renderEndpoint } from "./multiEsiEndpoints";

export const pluginMultiEsiQueryName = "plugin-multi-esi-query";

export const pluginMultiEsiQuery = definePlugin(() => ({
  name: pluginMultiEsiQueryName,
  options: {},
  resolveName(name: string) {
    return name;
  },
  async install() {
    // Read the spec directly rather than going through pluginOas: that plugin
    // emits a JSON schema file per component (315 of them here) as a side
    // effect, and this plugin only needs the raw document.
    const outputDir = path.resolve(
      this.config.root,
      this.config.output.path,
      "multi",
    );
    const input = this.config.input;
    if (!("path" in input)) {
      throw new Error("pluginMultiEsiQuery needs an input path to the spec");
    }
    const specPath = path.resolve(this.config.root, input.path);
    const document = JSON.parse(readFileSync(specPath, "utf8")) as Record<
      string,
      unknown
    >;
    const paths = (document.paths ?? {}) as Record<
      string,
      Record<string, EsiOperation>
    >;

    const endpoints: MultiEsiEndpoint[] = [];
    for (const [route, operations] of Object.entries(paths)) {
      const operation = operations.get;
      if (!operation) continue;
      const endpoint = describeEndpoint(route, operation, document);
      if (endpoint) endpoints.push(endpoint);
    }
    endpoints.sort((a, b) => a.hookName.localeCompare(b.hookName));

    for (const endpoint of endpoints) {
      await this.upsertFile({
        baseName: endpoint.fileName as `${string}.${string}`,
        path: path.resolve(outputDir, endpoint.fileName),
        sources: [
          {
            name: endpoint.hookName,
            value: renderEndpoint(endpoint),
            isExportable: true,
            isIndexable: true,
          },
        ],
        imports: [],
        exports: [],
      });
    }

    await this.upsertFile({
      baseName: "index.ts" as const,
      path: path.resolve(outputDir, "index.ts"),
      sources: [
        {
          name: "index",
          value: endpoints
            .map((e) => `export * from "./${e.hookName}";`)
            .join("\n"),
          isExportable: true,
          isIndexable: true,
        },
      ],
      imports: [],
      exports: [],
    });
  },
}));
