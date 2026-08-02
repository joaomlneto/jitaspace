// Generates components/Wallet/accountingEntryTypes.ts — the lookup table that
// turns an ESI wallet journal `ref_type` into the name and description EVE
// itself uses for that kind of transaction.
//
// Two upstream sources are needed, because neither one alone has both halves:
//   - hoboleaks' accountingentrytypes.json has the names/descriptions, but is
//     keyed by the SDE's numeric accountEntryTypeID.
//   - CCP's eve-glue has the authoritative ref_type string -> numeric ID map
//     (ESI links to it from the ref_type docs).
//
// Run: node scripts/generate-accounting-entry-types.mjs

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";

const ENTRY_TYPES_URL =
  "https://sde.hoboleaks.space/tq/accountingentrytypes.json";
const REF_TYPE_MAP_URL =
  "https://raw.githubusercontent.com/ccpgames/eve-glue/master/eve_glue/wallet_journal_ref.py";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(
  here,
  "..",
  "components",
  "Wallet",
  "accountingEntryTypes.ts",
);

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }
  return response.text();
}

/**
 * eve-glue declares the mapping as a python enum plus `new_from_enum` additions,
 * so pull both `name = 123` members and `"name": 123,` dict entries out of it.
 * One member wraps its value in parentheses to fit a lint comment, which puts
 * the number on the following line — hence the second alternative.
 */
function parseRefTypeIds(python) {
  const ids = new Map();
  const enumMember =
    /^ {4}([a-z_0-9]+) = (?:(\d+)|\((?:[^)]*?\s)?(\d+)\s*\))/gm;
  for (const [, name, value, wrappedValue] of python.matchAll(enumMember)) {
    ids.set(name, Number(value ?? wrappedValue));
  }
  for (const [, name, value] of python.matchAll(
    /^\s+"([a-z_0-9]+)": (\d+),/gm,
  )) {
    ids.set(name, Number(value));
  }
  return ids;
}

const [entryTypesJson, refTypePython] = await Promise.all([
  fetchText(ENTRY_TYPES_URL),
  fetchText(REF_TYPE_MAP_URL),
]);

const entryTypes = JSON.parse(entryTypesJson);
const refTypeIds = parseRefTypeIds(refTypePython);

/**
 * A handful of SDE descriptions are unusable as tooltips: some are unfilled
 * localization templates ("Payment for use of {[item]arg1.name}."), one is
 * literally "placeholder". Journal rows already show ESI's resolved
 * description, so drop these rather than surfacing the raw string.
 */
function usableDescription(description) {
  if (!description) return undefined;
  if (description.includes("{")) return undefined;
  if (description.trim().toLowerCase() === "placeholder") return undefined;
  return description;
}

const entries = [];
const unmapped = [];
for (const [refType, id] of [...refTypeIds].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  const entryType = entryTypes[String(id)];
  if (!entryType) {
    unmapped.push(refType);
    continue;
  }
  // *Translated fields are what the EVE client shows; `name`/`description` are
  // the older internal strings and are kept only as a fallback.
  entries.push({
    refType,
    id,
    name: entryType.entryTypeNameTranslated || entryType.name,
    description: usableDescription(
      entryType.entryTypeDescriptionTranslated || entryType.description,
    ),
  });
}

if (unmapped.length > 0) {
  console.warn(`No accounting entry type for: ${unmapped.join(", ")}`);
}

const quote = (value) => JSON.stringify(value);

const body = entries
  .map(({ refType, id, name, description }) => {
    const fields = [`id: ${id}`, `name: ${quote(name)}`];
    if (description) fields.push(`description: ${quote(description)}`);
    return `  ${quote(refType)}: { ${fields.join(", ")} },`;
  })
  .join("\n");

const file = `// Names and descriptions for EVE's wallet journal entry types, keyed by the
// ESI wallet journal \`ref_type\`.
//
// GENERATED FILE — do not edit by hand. Regenerate with:
//   node scripts/generate-accounting-entry-types.mjs
//
// Sources: ${ENTRY_TYPES_URL}
//          ${REF_TYPE_MAP_URL}

export interface AccountingEntryType {
  /** \`accountEntryTypeID\` in the SDE — the numeric id CCP uses internally. */
  id: number;
  /** Name as shown in the EVE client's wallet journal. */
  name: string;
  /** Longer explanation of the transaction, when the SDE provides one. */
  description?: string;
}

export const accountingEntryTypes: Record<string, AccountingEntryType> = {
${body}
};

/**
 * Turns an unknown \`ref_type\` into something readable ("some_new_fee" ->
 * "Some New Fee"), so entry types CCP adds after this file was generated still
 * render sensibly.
 */
export function humanizeRefType(refType: string): string {
  return refType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** The accounting entry type for a journal entry's \`ref_type\`, if we know it. */
export function getAccountingEntryType(
  refType?: string,
): AccountingEntryType | undefined {
  return refType === undefined ? undefined : accountingEntryTypes[refType];
}

/** Display name for a journal entry's \`ref_type\`. */
export function getAccountingEntryTypeName(refType?: string): string {
  if (refType === undefined) return "";
  return accountingEntryTypes[refType]?.name ?? humanizeRefType(refType);
}
`;

// Format with the repo's prettier config so regenerating produces no diff after
// `pnpm format`.
const config = await prettier.resolveConfig(outFile);
await writeFile(
  outFile,
  await prettier.format(file, { ...config, filepath: outFile }),
);
console.log(`Wrote ${entries.length} accounting entry types to ${outFile}`);
