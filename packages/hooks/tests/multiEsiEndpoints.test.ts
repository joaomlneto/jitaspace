import { describe, expect, it } from "@jest/globals";

import type { EsiOperation } from "../kubb/multiEsiEndpoints";
import { describeEndpoint, renderEndpoint } from "../kubb/multiEsiEndpoints";

// The codegen's decision logic: which ESI operations can be fanned out over
// subjects, and what the emitted hook looks like. 55 generated files depend on
// this, so it is worth pinning independently of running kubb.

const ARRAY_RESPONSE = {
  "200": {
    content: {
      "application/json": {
        schema: { type: "array", items: { type: "object" } },
      },
    },
  },
};
const OBJECT_RESPONSE = {
  "200": { content: { "application/json": { schema: { type: "object" } } } },
};
const SCALAR_ARRAY_RESPONSE = {
  "200": {
    content: {
      "application/json": {
        schema: { type: "array", items: { type: "integer" } },
      },
    },
  },
};

const operation = (overrides: Partial<EsiOperation> = {}): EsiOperation => ({
  operationId: "GetCharactersCharacterIdFittings",
  security: [{ OAuth2: ["esi-fittings.read_fittings.v1"] }],
  responses: ARRAY_RESPONSE,
  ...overrides,
});

const describeAt = (
  route: string,
  overrides: Partial<EsiOperation> = {},
  document: Record<string, unknown> = {},
) => describeEndpoint(route, operation(overrides), document);

describe("describeEndpoint — what is included", () => {
  it("derives kind, scope and names from a character route", () => {
    const endpoint = describeAt("/characters/{character_id}/fittings");

    expect(endpoint).toMatchObject({
      hookName: "useMultipleCharacterFittings",
      fileName: "useMultipleCharacterFittings.ts",
      kind: "character",
      scopes: ["esi-fittings.read_fittings.v1"],
      roles: [],
      paginated: false,
      operationName: "getCharactersCharacterIdFittings",
    });
  });

  it("names nested resources from every segment after the subject", () => {
    expect(
      describeAt("/corporations/{corporation_id}/orders/history")?.hookName,
    ).toBe("useMultipleCorporationOrdersHistory");
    // The three mining routes use a singular /corporation/ collection.
    expect(
      describeAt("/corporation/{corporation_id}/mining/observers")?.hookName,
    ).toBe("useMultipleCorporationMiningObservers");
  });

  it("pascal-cases hyphenated segments", () => {
    expect(
      describeAt("/characters/{character_id}/agents-research")?.hookName,
    ).toBe("useMultipleCharacterAgentsResearch");
  });

  it("picks up accepted roles and pagination", () => {
    const endpoint = describeAt("/corporations/{corporation_id}/assets", {
      "x-required-roles": ["Director"],
      parameters: [{ name: "page", in: "query" }],
    });

    expect(endpoint).toMatchObject({
      kind: "corporation",
      roles: ["Director"],
      paginated: true,
      hasQueryParams: true,
    });
  });

  it("follows $ref schemas, which is how the real spec declares them", () => {
    // The response and its items are both refs in swagger.json, so the
    // array-of-objects vs array-of-scalars decision depends on resolving them.
    const document = {
      components: {
        schemas: {
          FittingList: {
            type: "array",
            items: { $ref: "#/components/schemas/Fitting" },
          },
          Fitting: { type: "object" },
          ImplantList: {
            type: "array",
            items: { $ref: "#/components/schemas/TypeId" },
          },
          TypeId: { type: "integer" },
        },
      },
    };
    const refResponse = (name: string) => ({
      "200": {
        content: {
          "application/json": {
            schema: { $ref: `#/components/schemas/${name}` },
          },
        },
      },
    });

    expect(
      describeAt(
        "/characters/{character_id}/fittings",
        { responses: refResponse("FittingList") },
        document,
      )?.single,
    ).toBe(false);
    expect(
      describeAt(
        "/characters/{character_id}/implants",
        { responses: refResponse("ImplantList") },
        document,
      )?.single,
    ).toBe(true);
  });

  it("handles alliance routes", () => {
    expect(describeAt("/alliances/{alliance_id}/contacts")?.kind).toBe(
      "alliance",
    );
  });
});

describe("describeEndpoint — what is skipped", () => {
  it("skips unauthenticated operations", () => {
    expect(
      describeAt("/characters/{character_id}/fittings", { security: [] }),
    ).toBeNull();
  });

  it("skips routes with no subject parameter", () => {
    expect(describeAt("/markets/prices")).toBeNull();
  });

  it("skips routes with a second path parameter", () => {
    // The extra id identifies one resource *within* a subject, so "every
    // subject" does not describe it.
    expect(
      describeAt("/characters/{character_id}/contracts/{contract_id}/items"),
    ).toBeNull();
  });

  it("skips routes with a required query parameter", () => {
    // A subject fan-out has nowhere to take a caller-supplied argument from:
    // searching across every character still needs the search term.
    expect(
      describeAt("/characters/{character_id}/search", {
        parameters: [
          { name: "categories", in: "query", required: true },
          { name: "search", in: "query", required: true },
        ],
      }),
    ).toBeNull();
  });

  it("does not treat page as a caller-supplied argument", () => {
    expect(
      describeAt("/corporations/{corporation_id}/assets", {
        parameters: [{ name: "page", in: "query", required: true }],
      }),
    ).not.toBeNull();
  });

  it("skips cursor-paginated routes", () => {
    // after/before/limit is not the page + x-pages scheme esiPagedQueryOptions
    // walks, so these would silently return only the server's first page.
    expect(
      describeAt("/corporations/{corporation_id}/projects", {
        parameters: [
          { name: "after", in: "query" },
          { name: "before", in: "query" },
          { name: "limit", in: "query" },
        ],
      }),
    ).toBeNull();
  });

  it("skips operations with no declared response schema", () => {
    expect(
      describeAt("/characters/{character_id}/fittings", { responses: {} }),
    ).toBeNull();
  });
});

describe("describeEndpoint — single-value endpoints", () => {
  it("marks a non-array response as single rather than skipping it", () => {
    const endpoint = describeAt("/characters/{character_id}/location", {
      responses: OBJECT_RESPONSE,
    });

    expect(endpoint).toMatchObject({
      hookName: "useMultipleCharacterLocation",
      single: true,
      paginated: false,
    });
  });

  it("marks an array of objects as not single", () => {
    expect(describeAt("/characters/{character_id}/fittings")?.single).toBe(
      false,
    );
  });

  it("treats an array of scalars as single", () => {
    // The list primitive tags items by spreading them, and spreading a number
    // yields only the tag — every implant id would be replaced by { subjectId }.
    const endpoint = describeAt("/characters/{character_id}/implants", {
      responses: SCALAR_ARRAY_RESPONSE,
    });

    expect(endpoint?.single).toBe(true);
  });

  it("emits the value primitive for an array of scalars", () => {
    const source = renderEndpoint(
      describeAt("/characters/{character_id}/implants", {
        operationId: "GetCharactersCharacterIdImplants",
        responses: SCALAR_ARRAY_RESPONSE,
      })!,
    );

    expect(source).toContain("defineMultiEsiValueQuery({");
  });
});

describe("renderEndpoint", () => {
  it("calls the generated query options directly for a simple endpoint", () => {
    const source = renderEndpoint(
      describeAt("/characters/{character_id}/fittings")!,
    );

    expect(source).toContain(
      "getCharactersCharacterIdFittingsQueryOptions(subjectId, authHeaders)",
    );
    // Reusing the generated options verbatim is what shares the cache entry
    // with the single-subject hook.
    expect(source).not.toContain("esiPagedQueryOptions");
    expect(source).not.toContain("roles:");
  });

  it("leaves a slot for query params when the endpoint takes them", () => {
    const source = renderEndpoint(
      describeAt("/characters/{character_id}/blueprints", {
        parameters: [{ name: "something", in: "query" }],
      })!,
    );

    // `undefined`, not `{}`: the generated key builder appends params when
    // truthy, so `{}` would land on a different cache entry than the
    // single-subject hook for the same endpoint.
    expect(source).toContain("QueryOptions(subjectId, undefined, authHeaders)");
    expect(source).not.toContain("{}, authHeaders");
  });

  it("uses the paged options and threads the signal when paginated", () => {
    const source = renderEndpoint(
      describeAt("/corporations/{corporation_id}/assets", {
        operationId: "GetCorporationsCorporationIdAssets",
        "x-required-roles": ["Director"],
        parameters: [{ name: "page", in: "query" }],
      })!,
    );

    expect(source).toContain("esiPagedQueryOptions({");
    expect(source).toContain(
      "getCorporationsCorporationIdAssetsQueryKey(subjectId)",
    );
    expect(source).toContain("{ page }, authHeaders, { signal }");
    expect(source).toContain('roles: ["Director"]');
  });

  it("uses the value primitive for a single-value endpoint", () => {
    const source = renderEndpoint(
      describeAt("/characters/{character_id}/location", {
        operationId: "GetCharactersCharacterIdLocation",
        responses: OBJECT_RESPONSE,
      })!,
    );

    expect(source).toContain("defineMultiEsiValueQuery({");
    expect(source).toContain(
      'import { defineMultiEsiValueQuery } from "../../hooks/multi"',
    );
    // One entry per subject, so there is no list to flatten or paginate.
    expect(source).not.toContain("esiPagedQueryOptions");
  });

  it("emits every accepted role, since they are an any-of list", () => {
    const source = renderEndpoint(
      describeAt("/corporations/{corporation_id}/wallets", {
        "x-required-roles": ["Accountant", "Junior_Accountant"],
      })!,
    );

    expect(source).toContain('roles: ["Accountant", "Junior_Accountant"]');
  });
});
