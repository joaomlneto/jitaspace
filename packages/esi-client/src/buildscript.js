import { readFileSync, writeFileSync } from "node:fs";
import path, { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {object} RateLimitExtension
 * @property {string} group
 * @property {number} [maxTokens]
 * @property {string} [windowSize]
 */

/**
 * Narrows an unknown value to a string-keyed record, or returns an empty record.
 * `JSON.parse` yields `any`, so the parsed swagger spec is walked through these
 * guards to keep the build script type-safe without trusting its shape.
 *
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
const asRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : {};

/**
 * Extracts the `x-rate-limit` fields from a swagger operation, if present.
 *
 * @param {unknown} operation
 * @returns {RateLimitExtension | null}
 */
const getRateLimit = (operation) => {
  const operationRecord = asRecord(operation);
  const rateLimit = asRecord(operationRecord["x-rate-limit"]);
  const group = rateLimit.group;
  if (typeof group !== "string" || group === "") {
    return null;
  }

  return {
    group,
    maxTokens:
      typeof rateLimit["max-tokens"] === "number"
        ? rateLimit["max-tokens"]
        : undefined,
    windowSize:
      typeof rateLimit["window-size"] === "string"
        ? rateLimit["window-size"]
        : undefined,
  };
};

/**
 * @param {unknown} operation
 * @returns {string | null}
 */
const getOperationId = (operation) => {
  const operationId = asRecord(operation).operationId;
  return typeof operationId === "string" && operationId !== ""
    ? operationId
    : null;
};

// Workaround for ESM import in Node.js
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

// get the current date in YYYY-MM-DD format
const esiCurrentDateString = "2025-12-16";

const swaggerPath = join(__dirname, "..", "swagger.json");
/** @type {unknown} */
const swaggerData = JSON.parse(readFileSync(swaggerPath, "utf-8"));

/** @type {Record<string, { maxTokens?: number; windowSize?: string }>} */
const rateLimits = {};
/** @type {Record<string, string>} */
const operationRateLimitGroups = {};
/** @type {Record<string, string>} */
const routeOperationIds = {};

const paths = asRecord(asRecord(swaggerData).paths);

for (const [routePath, methods] of Object.entries(paths)) {
  for (const [method, operation] of Object.entries(asRecord(methods))) {
    const rateLimit = getRateLimit(operation);
    const operationId = getOperationId(operation);
    if (!rateLimit || !operationId) {
      continue;
    }

    rateLimits[rateLimit.group] ??= {
      maxTokens: rateLimit.maxTokens,
      windowSize: rateLimit.windowSize,
    };

    operationRateLimitGroups[operationId] = rateLimit.group;
    routeOperationIds[`${method.toLowerCase()}:${routePath}`] = operationId;
  }
}

// write build data to build-data.json
writeFileSync(
  join(__dirname, "build-data.json"),
  JSON.stringify(
    {
      buildDate: esiCurrentDateString,
      rateLimits,
      operationRateLimitGroups,
      routeOperationIds,
    },
    null,
    2,
  ),
  "utf-8",
);
