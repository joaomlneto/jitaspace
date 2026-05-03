import { readFileSync, writeFileSync } from "fs";
import path, { join } from "path";
import { fileURLToPath } from "url";

// Workaround for ESM import in Node.js
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

// get the current date in YYYY-MM-DD format
const esiCurrentDateString = "2025-12-16";

const swaggerPath = join(__dirname, "..", "swagger.json");
const swaggerData = JSON.parse(readFileSync(swaggerPath, "utf-8"));

const rateLimits = {};
const operationRateLimitGroups = {};
const routeOperationIds = {};

for (const [routePath, methods] of Object.entries(swaggerData.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!operation["x-rate-limit"] || !operation.operationId) {
      continue;
    }

    const {
      group,
      "max-tokens": maxTokens,
      "window-size": windowSize,
    } = operation["x-rate-limit"];

    if (!rateLimits[group]) {
      rateLimits[group] = {
        maxTokens,
        windowSize,
      };
    }

    operationRateLimitGroups[operation.operationId] = group;
    routeOperationIds[`${method.toLowerCase()}:${routePath}`] =
      operation.operationId;
  }
}

// write build data to build-data.json
writeFileSync(
  join(__dirname, "build-data.json"),
  JSON.stringify(
    {
      buildDate: esiCurrentDateString,
      rateLimits: rateLimits || {},
      operationRateLimitGroups: operationRateLimitGroups || {},
      routeOperationIds: routeOperationIds || {},
    },
    null,
    2,
  ),
  "utf-8",
);
