import * as fs from "node:fs";
import * as path from "node:path";
import { createCommand } from "@commander-js/extra-typings";

import { collections } from "../config/collections.js";
import { TITLE_WIDTH, getWorkingDirectory } from "../lib/cli.js";
import { globalProgress } from "../lib/progress.js";
import { generateCollectionFiles } from "../utils/collections.js";
import { mkdir } from "../utils/fs";
import {
  ensureSdePresentAndExtracted,
  latestSdeLastModified,
} from "../utils/sde.js";

export const SDE_PATH = "sde";

export default createCommand("generate")
  .description("Generate OpenAPI spec and JSON files from latest SDE")
  .action(async () => {
    await ensureSdePresentAndExtracted();

    const totalProgress = globalProgress.create(
      Object.keys(collections).length,
      0,
      {
        title: "Total Progress".padEnd(TITLE_WIDTH),
      },
    );
    globalProgress.update();

    const schema = {
      openapi: "3.0.0",
      info: {
        title: "EVE Static Data Export",
        description: "An OpenAPI for the SDE.",
        version: "21.03.2",
        contact: {
          name: "Joao Neto",
          url: "https://www.jita.space/about",
        },
      },
      servers: [
        {
          url: "https://sde.jita.space/latest",
          description: "Latest version of the SDE",
        },
      ],
      tags: [
        ...Object.values(collections).reduce((tags: Set<string>, file) => {
          file.tags.forEach((tag) => tags.add(tag));
          return tags;
        }, new Set<string>([])),
      ].map((tag) => ({ name: tag })),
      paths: {},
      components: {
        schemas: {},
      },
    };

    globalProgress.log(`Writing files to ${path.join(getWorkingDirectory())}`);

    for (const collectionName of Object.keys(collections)) {
      await generateCollectionFiles(collectionName, schema);
      totalProgress.increment();
      globalProgress.update();
    }

    const sdeLastModified = await latestSdeLastModified();

    // add metadata paths
    const METADATA_VERSION_PATH = "/meta";
    const metaPath = path.join(getWorkingDirectory(), "latest", "meta");
    mkdir(metaPath);
    const metaVersionPath = path.join(metaPath, "version.json");
    fs.writeFileSync(
      metaVersionPath,
      JSON.stringify({
        sourceSdePublishDate: sdeLastModified.toISOString(),
        generationDate: new Date().toISOString(),
      }),
    );
    schema.tags.push({ name: "Meta" });
    // @ts-expect-error
    schema.paths["/meta/version"] = {
      get: {
        tags: ["Meta"],
        description: "Get API Version",
        operationId: "getVersion",
        responses: {
          200: {
            description: "Information about the API contents",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sourceSdePublishDate: {
                      type: "string",
                      format: "date-time",
                      description: "The date when the source SDE was published",
                    },
                    generationDate: {
                      type: "string",
                      format: "date-time",
                      description:
                        "The date when the contents of the API were updated",
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Sort the paths alphabetically
    const sortedPaths = {};
    const sortedKeys = Object.keys(schema.paths).sort();
    // @ts-expect-error
    sortedKeys.forEach((key) => (sortedPaths[key] = schema.paths[key]));
    schema.paths = sortedPaths;

    // Sort the schemas alphabetically
    const sortedSchemas = {};
    const sortedSchemaKeys = Object.keys(schema.components.schemas).sort();
    sortedSchemaKeys.forEach(
      // @ts-expect-error
      (key) => (sortedSchemas[key] = schema.components.schemas[key]),
    );
    schema.components.schemas = sortedSchemas;

    // Sort the tags alphabetically, removing duplicates
    schema.tags = [...new Set(schema.tags.map((tag) => tag.name).sort())].map(
      (name) => ({ name }),
    );

    // write the schema file
    await fs.promises.writeFile(
      path.join(getWorkingDirectory(), "latest", `swagger.json`),
      JSON.stringify(schema, null, 2),
    );

    totalProgress.stop();
    globalProgress.stop();
  });
