import fs from "node:fs";
import * as path from "node:path";
import convert from "@openapi-contrib/json-schema-to-openapi-schema";
import { camelCase, capitalCase, pascalCase } from "change-case";
import { js2schema } from "js2schema";

import { SDE_PATH } from "../commands/generate.js";
import { collections } from "../config/collections.js";
import { getWorkingDirectory, TITLE_WIDTH } from "../lib/cli.js";
import { globalProgress } from "../lib/progress.js";
import { getHoboleaksFile } from "../sources/hoboleaks.js";
import { getUniverseSourceData } from "../sources/sde_universe.js";
import { loadFile } from "../sources/sde.js";
import { mkdir } from "./fs.js";

export function sdeCamelCase(str: string) {
  const result = camelCase(str);
  return result.endsWith("Id") ? result.slice(0, -2) + "ID" : result;
}

export async function generateCollectionFiles(
  collectionId: keyof typeof collections,
  schema: {
    paths: Record<string, any>;
    components: {
      schemas: Record<string, any>;
    };
  },
) {
  const sdeRoot = path.resolve(getWorkingDirectory(), SDE_PATH);
  const collection = collections[collectionId];

  if (collection === undefined) {
    throw new Error(`Unknown collection ${collectionId}`);
  }

  const progress = globalProgress.create(0, 0, {
    title: `Generating ${collectionId}`.padEnd(TITLE_WIDTH),
  });
  globalProgress.update();

  // Read file
  let data = await (async () => {
    switch (collection.datasource.type) {
      case "sde":
        return loadFile(collection.datasource.name, sdeRoot);
      case "sde-universe":
        return await getUniverseSourceData(collection.datasource.name);
      case "hoboleaks":
        return await getHoboleaksFile(collection.datasource.filename);
      default:
        throw new Error(
          `Unsupported datasource type ${collection.datasource.type}`,
        );
    }
  })();

  for (const transformFn of collection.datasource.transformations ?? []) {
    data = transformFn(data, { idAttributeName: collection.idAttribute });
  }

  progress.setTotal(Object.keys(data).length);
  globalProgress.update();

  // create required directories
  const bundlesPath = path.join(
    getWorkingDirectory(),
    "bundled",
    ...collectionId.split("/").slice(0, -1),
  );
  const indexPath = path.join(
    getWorkingDirectory(),
    "latest",
    `${collectionId}.json`,
  );
  const collectionPath = path.join(
    getWorkingDirectory(),
    "latest",
    collectionId,
  );
  mkdir(bundlesPath);
  mkdir(collectionPath);

  // Write bundled file
  const outPath = path.join(
    bundlesPath,
    `${collectionId.split("/").at(-1)}.json`,
  );
  fs.writeFileSync(outPath, JSON.stringify(data));

  const idAttributeType = Object.keys(data).every(
    (key) => key.match(/^\d+$/) != null,
  )
    ? "number"
    : "string";

  // write index file
  const allIds = Object.keys(data).map((key) =>
    idAttributeType === "number" ? parseInt(key) : key,
  );
  fs.writeFileSync(indexPath, JSON.stringify(allIds));

  globalProgress.update();

  // write individual entry files
  mkdir(collectionPath);
  Object.entries(data).forEach(([key, value], index) => {
    if (index % 100 === 0) {
      globalProgress.update();
    }
    progress.increment();
    fs.writeFileSync(
      path.join(collectionPath, `${key}.json`),
      JSON.stringify(value),
    );
  });

  progress.stop();
  globalProgress.update();

  // write schema file
  const jsonSchema = js2schema(Object.values(data), {
    title: "",
    shouldConvertNumberString: true,
    typeResolvers: {},
  });
  const unpatchedOpenApiSchema = await convert(jsonSchema);
  const openApiSchema = collection.model.patchSchema
    ? collection.model.patchSchema(unpatchedOpenApiSchema)
    : unpatchedOpenApiSchema;

  // @ts-expect-error
  Object.values(openApiSchema.items.properties ?? []).forEach(
    (property: any) => {
      delete property.description;
    },
  );

  schema.components.schemas[pascalCase(collection.model.name)] = {
    // @ts-expect-error
    ...openApiSchema.items,
    description:
      collection.model.description ??
      `Represents a ${capitalCase(collection.model.name)}`,
    /*
    example:
      data[
        // @ts-expect-error
        Object.keys(data)[Math.floor(Math.random() * Object.keys(data).length)]
      ],
    */
  };

  schema.paths[`${collectionId}`] = {
    get: {
      tags: collection.tags,
      description: `Get all ${capitalCase(collection.model.name)} IDs`,
      operationId: `getAll${pascalCase(collection.model.name)}Ids`,
      responses: {
        200: {
          description: `A list of all ${capitalCase(
            collection.model.name,
          )} IDs`,
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: idAttributeType,
                },
              },
              /*
              examples: {
                example: {
                  value: allIds.slice(0, 10),
                },
              },
              */
            },
          },
        },
      },
    },
  };

  schema.paths[`${collectionId}/{${sdeCamelCase(collection.idAttribute)}}`] = {
    get: {
      tags: collection.tags,
      description: `Get ${capitalCase(collection.model.name)} by its ID`,
      operationId: `get${pascalCase(collection.model.name)}ById`,
      parameters: [
        {
          name: sdeCamelCase(collection.idAttribute),
          in: "path",
          description: `The ID of the ${capitalCase(
            collection.model.name,
          )} to get`,
          required: true,
          schema: {
            type: idAttributeType,
          },
        },
      ],
      responses: {
        200: {
          description: `The requested ${capitalCase(collection.model.name)}`,
          content: {
            "application/json": {
              schema: {
                $ref: `#/components/schemas/${pascalCase(
                  collection.model.name,
                )}`,
              },
              /*
              example:
                data[
                  // @ts-expect-error
                  Object.keys(data)[
                    Math.floor(Math.random() * Object.keys(data).length)
                  ]
                ],
              */
            },
          },
        },
        404: {
          description: `The requested ${capitalCase(
            collection.model.name,
          )} was not found`,
        },
      },
    },
  };

  globalProgress.remove(progress);
  globalProgress.update();
}
