// @ts-check
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
 *   node scripts/generate-scopes.mjs [pathOrUrl]
 *
 * Human-readable scope descriptions are NOT generated — the 3.1 spec only
 * echoes the scope name. They live in the hand-curated src/scopes/descriptions.ts;
 * this script just warns when a scope has no description (a nag, never a failure).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scopesDir = resolve(__dirname, "../src/scopes");
const DEFAULT_SPEC = resolve(__dirname, "../../esi-client/swagger.json");

const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "head", "options"];

const header = (regenCmd) =>
  `// This file is auto-generated from the EVE Online ESI OpenAPI spec.\n` +
  `// Do not edit by hand — run \`${regenCmd}\`.\n`;
const REGEN = "pnpm --filter @jitaspace/esi-metadata kubb:generate";

async function loadSpec(source) {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch spec: ${res.status} ${res.statusText}`);
    return res.json();
  }
  return JSON.parse(readFileSync(source, "utf8"));
}

async function format(code, filepath) {
  try {
    const prettier = await import("prettier");
    const config = await prettier.resolveConfig(filepath);
    return await prettier.format(code, { ...config, filepath, parser: "typescript" });
  } catch {
    return code; // prettier is best-effort; committed files get formatted on the next pass
  }
}

async function main() {
  const source = process.argv[2] ?? DEFAULT_SPEC;
  const spec = await loadSpec(source);

  // 1. Scope list — securitySchemes.OAuth2 scopes (sorted for stable diffs).
  const scopeObj =
    spec?.components?.securitySchemes?.OAuth2?.flows?.authorizationCode?.scopes;
  if (!scopeObj) throw new Error("Could not find OAuth2 scopes in spec securitySchemes");
  const scopeList = Object.keys(scopeObj).sort((a, b) => a.localeCompare(b));
  const scopeSet = new Set(scopeList);

  const scopesCode = await format(
    `${header(REGEN)}\nexport const scopes = [\n${scopeList
      .map((s) => `  ${JSON.stringify(s)},`)
      .join("\n")}\n] as const;\n`,
    resolve(scopesDir, "scopes.generated.ts"),
  );
  writeFileSync(resolve(scopesDir, "scopes.generated.ts"), scopesCode);

  // 2. Endpoint -> method -> required scopes, derived from each operation's security.
  const paths = spec?.paths ?? {};
  /** @type {Record<string, Record<string, string[]>>} */
  const endpointScopes = {};
  for (const path of Object.keys(paths).sort((a, b) => a.localeCompare(b))) {
    const key = path.endsWith("/") ? path : `${path}/`;
    const methods = paths[path] ?? {};
    /** @type {Record<string, string[]>} */
    const entry = {};
    for (const method of Object.keys(methods)) {
      if (!HTTP_METHODS.includes(method)) continue;
      const op = methods[method];
      const security = Array.isArray(op?.security) ? op.security : [];
      entry[method] = [...new Set(security.flatMap((s) => s?.OAuth2 ?? []))];
    }
    if (Object.keys(entry).length > 0) endpointScopes[key] = entry;
  }

  // One endpoint per line; prettier wraps only the long ones (matches prior style).
  const endpointLines = Object.entries(endpointScopes).map(([ep, methods]) => {
    const inner = Object.entries(methods)
      .map(([method, scopeArr]) => `${method}: ${JSON.stringify(scopeArr)}`)
      .join(", ");
    return `  ${JSON.stringify(ep)}: { ${inner} },`;
  });
  const endpointsCode = await format(
    `${header(REGEN)}\nimport type { ESIScope } from "./scopes";\n\n` +
      `export const endpointScopes: Record<string, Record<string, ESIScope[]>> = {\n` +
      `${endpointLines.join("\n")}\n};\n`,
    resolve(scopesDir, "endpoints.generated.ts"),
  );
  writeFileSync(resolve(scopesDir, "endpoints.generated.ts"), endpointsCode);

  // 3. Nag (non-blocking): flag scopes lacking a curated description, and any
  //    orphaned descriptions for scopes the spec no longer lists.
  const describedKeys = new Set();
  for (const line of readFileSync(resolve(scopesDir, "descriptions.ts"), "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) continue;
    const match = trimmed.match(/^"(esi-[^"]+)"\s*:/);
    if (match) describedKeys.add(match[1]);
  }
  const missing = scopeList.filter((s) => !describedKeys.has(s));
  const orphaned = [...describedKeys].filter((s) => !scopeSet.has(s));

  console.log(
    `Generated ${scopeList.length} scopes and ${Object.keys(endpointScopes).length} endpoints from ${source}`,
  );
  if (missing.length > 0) {
    console.warn(
      `\n⚠ ${missing.length} scope(s) have no curated description in descriptions.ts:\n` +
        missing.map((s) => `    ${s}`).join("\n"),
    );
  }
  if (orphaned.length > 0) {
    console.warn(
      `\n⚠ ${orphaned.length} description(s) reference scopes no longer in the spec — remove them from descriptions.ts (they will fail type-check):\n` +
        orphaned.map((s) => `    ${s}`).join("\n"),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
