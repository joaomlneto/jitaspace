/**
 * Emits one `useMultipleXXX` hook per subject-scoped ESI list endpoint.
 *
 * Everything the hooks need is machine-readable in the spec: `security` gives
 * the scope, `x-required-roles` the accepted corporation roles, the path
 * parameter the subject kind, and a `page` query parameter marks pagination.
 * So there is no hand-maintained mapping table — regenerating after a spec
 * update picks up new endpoints and changed scopes on its own.
 *
 * This lives in @jitaspace/hooks rather than @jitaspace/esi-client because the
 * emitted hooks import `defineMultiEsiQuery` from this package, and esi-client
 * cannot depend on it without a workspace cycle. `pnpm kubb:generate` is a
 * turbo task, so it still runs both packages' generation in one command.
 */

type SubjectKind = "character" | "corporation" | "alliance";

const SUBJECT_PARAMS: Record<string, SubjectKind> = {
  character_id: "character",
  corporation_id: "corporation",
  alliance_id: "alliance",
};

export interface EsiOperation {
  operationId?: string;
  security?: Record<string, string[]>[];
  parameters?: { name?: string; in?: string }[];
  responses?: Record<string, unknown>;
  "x-required-roles"?: string[];
}

const pascal = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const camel = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

/** Resolve a `$ref` against the document, one level deep is enough for ESI. */
function deref(
  schema: Record<string, unknown> | undefined,
  document: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const ref = schema?.$ref;
  if (typeof ref !== "string") return schema;
  let current: unknown = document;
  for (const segment of ref.replace(/^#\//, "").split("/")) {
    current = (current as Record<string, unknown> | undefined)?.[segment];
  }
  return current as Record<string, unknown> | undefined;
}

export interface MultiEsiEndpoint {
  hookName: string;
  fileName: string;
  kind: SubjectKind;
  scopes: string[];
  roles: string[];
  paginated: boolean;
  /** The endpoint takes query parameters, so the generated options need a slot for them. */
  hasQueryParams: boolean;
  /** camelCased operationId, which is the base kubb names its exports from. */
  operationName: string;
}

/**
 * Decide whether an operation can be fanned out over subjects, and describe it
 * if so.
 *
 * Skipped: anything with a second path parameter (it identifies one resource
 * *within* a subject, so "every subject" does not apply), and anything whose
 * 200 response is not an array — `defineMultiEsiQuery` returns one flat tagged
 * list, which a single object or scalar cannot contribute to.
 */
export function describeEndpoint(
  route: string,
  operation: EsiOperation,
  document: Record<string, unknown>,
): MultiEsiEndpoint | null {
  if (!operation.security?.length) return null;
  if (!operation.operationId) return null;

  const pathParams = [...route.matchAll(/\{(\w+)\}/g)].flatMap(
    ([, name]) => name ?? [],
  );
  const subjectParam = pathParams.find((name) => name in SUBJECT_PARAMS);
  if (!subjectParam) return null;
  if (pathParams.some((name) => name !== subjectParam)) return null;

  const responses = operation.responses as
    | Record<string, Record<string, never>>
    | undefined;
  const content = responses?.["200"]?.content as
    | Record<string, { schema?: Record<string, unknown> }>
    | undefined;
  const schema = deref(content?.["application/json"]?.schema, document);
  if (schema?.type !== "array") return null;

  const queryParams = (operation.parameters ?? [])
    .filter((parameter) => parameter.in === "query")
    .map((parameter) => parameter.name);

  const kind = SUBJECT_PARAMS[subjectParam];
  if (!kind) return null;
  // Drop the leading collection segment and every path parameter; what is left
  // names the resource. /corporations/{corporation_id}/orders/history reads as
  // useMultipleCorporationOrdersHistory.
  const resource = route
    .split("/")
    .filter(Boolean)
    .slice(1)
    .filter((segment) => !segment.startsWith("{"))
    .map(pascal)
    .join("");
  const hookName = `useMultiple${pascal(kind)}${resource}`;

  return {
    hookName,
    fileName: `${hookName}.ts`,
    kind,
    scopes: Object.values(operation.security[0] ?? {}).flat(),
    roles: operation["x-required-roles"] ?? [],
    paginated: queryParams.includes("page"),
    hasQueryParams: queryParams.length > 0,
    operationName: camel(operation.operationId),
  };
}

/** The generated hook's module source. */
export function renderEndpoint(endpoint: MultiEsiEndpoint): string {
  const {
    hookName,
    kind,
    scopes,
    roles,
    paginated,
    hasQueryParams,
    operationName,
  } = endpoint;

  const config = [
    `  kind: "${kind}",`,
    `  scopes: [${scopes.map((scope) => `"${scope}"`).join(", ")}],`,
    roles.length
      ? `  roles: [${roles.map((r) => `"${r}"`).join(", ")}],`
      : null,
  ].filter(Boolean);

  if (paginated) {
    return `"use client";

import {
  ${operationName},
  ${operationName}QueryKey,
} from "@jitaspace/esi-client";

import { defineMultiEsiQuery, esiPagedQueryOptions } from "../../hooks/multi";

export const ${hookName} = defineMultiEsiQuery({
${config.join("\n")}
  query: (subjectId, authHeaders) =>
    esiPagedQueryOptions({
      queryKey: ${operationName}QueryKey(subjectId),
      fetchPage: (page, signal) =>
        ${operationName}(subjectId, { page }, authHeaders, { signal }),
    }),
});
`;
  }

  const optionsArgs = hasQueryParams
    ? "subjectId, {}, authHeaders"
    : "subjectId, authHeaders";

  return `"use client";

import { ${operationName}QueryOptions } from "@jitaspace/esi-client";

import { defineMultiEsiQuery } from "../../hooks/multi";

export const ${hookName} = defineMultiEsiQuery({
${config.join("\n")}
  query: (subjectId, authHeaders) =>
    ${operationName}QueryOptions(${optionsArgs}),
});
`;
}
