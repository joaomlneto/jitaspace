/**
 * Generates the spec-derived scope metadata for @jitaspace/esi-metadata:
 *   - src/scopes/scopes.generated.ts     (the full scope list, as const)
 *   - src/scopes/endpoints.generated.ts  (endpoint -> method -> required scopes)
 *
 * Source of truth is the EVE Online ESI OpenAPI spec. By default we read the
 * same pinned spec that drives the ESI client codegen, so the scope list and
 * the client can never disagree. Pass a file path or URL to override (the CI
 * drift check points this at the live spec):
 *
 *   tsx scripts/generate-scopes.ts [pathOrUrl]
 *
 * Human-readable scope descriptions are NOT generated — the 3.1 spec only
 * echoes the scope name. They live in the hand-curated src/scopes/descriptions.ts;
 * this script just warns when a scope has no description (a nag, never a failure).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

interface OAuth2SecurityRequirement {
  OAuth2?: string[];
}
interface Operation {
  security?: OAuth2SecurityRequirement[];
}
interface OpenApiSpec {
  components?: {
    securitySchemes?: {
      OAuth2?: {
        flows?: { authorizationCode?: { scopes?: Record<string, string> } };
      };
    };
  };
  paths?: Record<string, Record<string, Operation>>;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const scopesDir = resolve(scriptDir, "../src/scopes");
const DEFAULT_SPEC = resolve(scriptDir, "../../esi-client/swagger.json");
const REGEN = "pnpm --filter @jitaspace/esi-metadata kubb:generate";

const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "head", "options"];

const header = (): string =>
  `// This file is auto-generated from the EVE Online ESI OpenAPI spec.\n` +
  `// Do not edit by hand — run \`${REGEN}\`.\n`;

async function loadSpec(source: string): Promise<OpenApiSpec> {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`Failed to fetch spec: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as OpenApiSpec;
  }
  return JSON.parse(readFileSync(source, "utf8")) as OpenApiSpec;
}

async function format(code: string, filepath: string): Promise<string> {
  try {
    const prettier = await import("prettier");
    const config = await prettier.resolveConfig(filepath);
    return await prettier.format(code, {
      ...config,
      filepath,
      parser: "typescript",
    });
  } catch {
    return code; // prettier is best-effort; committed files get formatted on the next pass
  }
}

async function main(): Promise<void> {
  const source = process.argv[2] ?? DEFAULT_SPEC;
  const spec = await loadSpec(source);

  // 1. Scope list — securitySchemes.OAuth2 scopes (sorted for stable diffs).
  const scopeObj =
    spec.components?.securitySchemes?.OAuth2?.flows?.authorizationCode?.scopes;
  if (!scopeObj) {
    throw new Error("Could not find OAuth2 scopes in spec securitySchemes");
  }
  const scopeList = Object.keys(scopeObj).sort((a, b) => a.localeCompare(b));
  const scopeSet = new Set(scopeList);

  const scopesCode = await format(
    `${header()}\nexport const scopes = [\n${scopeList
      .map((scope) => `  ${JSON.stringify(scope)},`)
      .join("\n")}\n] as const;\n`,
    resolve(scopesDir, "scopes.generated.ts"),
  );
  writeFileSync(resolve(scopesDir, "scopes.generated.ts"), scopesCode);

  // 2. Endpoint -> method -> required scopes, from each operation's security.
  const paths = spec.paths ?? {};
  const endpointScopes: Record<string, Record<string, string[]>> = {};
  for (const path of Object.keys(paths).sort((a, b) => a.localeCompare(b))) {
    const key = path.endsWith("/") ? path : `${path}/`;
    const methods = paths[path] ?? {};
    const entry: Record<string, string[]> = {};
    for (const method of Object.keys(methods)) {
      if (!HTTP_METHODS.includes(method)) continue;
      const operation = methods[method];
      const security = operation?.security ?? [];
      entry[method] = [...new Set(security.flatMap((req) => req.OAuth2 ?? []))];
    }
    if (Object.keys(entry).length > 0) endpointScopes[key] = entry;
  }

  // One endpoint per line; prettier wraps only the long ones (matches prior style).
  const endpointLines = Object.entries(endpointScopes).map(
    ([endpoint, methodMap]) => {
      const inner = Object.entries(methodMap)
        .map(([method, scopeArr]) => `${method}: ${JSON.stringify(scopeArr)}`)
        .join(", ");
      return `  ${JSON.stringify(endpoint)}: { ${inner} },`;
    },
  );
  const endpointsCode = await format(
    `${header()}\nimport type { ESIScope } from "./scopes";\n\n` +
      `export const endpointScopes: Record<string, Record<string, ESIScope[]>> = {\n` +
      `${endpointLines.join("\n")}\n};\n`,
    resolve(scopesDir, "endpoints.generated.ts"),
  );
  writeFileSync(resolve(scopesDir, "endpoints.generated.ts"), endpointsCode);

  // 3. Nag (non-blocking): flag scopes lacking a curated description, and any
  //    orphaned descriptions for scopes the spec no longer lists.
  const describedKeys = new Set<string>();
  const descriptionsSrc = readFileSync(
    resolve(scopesDir, "descriptions.ts"),
    "utf8",
  );
  for (const line of descriptionsSrc.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) continue;
    const scope = /^"(esi-[^"]+)"\s*:/.exec(trimmed)?.[1];
    if (scope) describedKeys.add(scope);
  }
  const missing = scopeList.filter((scope) => !describedKeys.has(scope));
  const orphaned = [...describedKeys].filter((scope) => !scopeSet.has(scope));

  console.log(
    `Generated ${scopeList.length} scopes and ${Object.keys(endpointScopes).length} endpoints from ${source}`,
  );
  if (missing.length > 0) {
    console.warn(
      `\n⚠ ${missing.length} scope(s) have no curated description in descriptions.ts:\n` +
        missing.map((scope) => `    ${scope}`).join("\n"),
    );
  }
  if (orphaned.length > 0) {
    console.warn(
      `\n⚠ ${orphaned.length} description(s) reference scopes no longer in the spec — remove them from descriptions.ts (they will fail type-check):\n` +
        orphaned.map((scope) => `    ${scope}`).join("\n"),
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
