import { describe, expect, it } from "@jest/globals";

import type { EsiOperation } from "../kubb/multiEsiEndpoints";
import { describeEndpoint, renderEndpoint } from "../kubb/multiEsiEndpoints";

// The codegen's decision logic: which ESI operations can be fanned out over
// subjects, and what the emitted hook looks like. 55 generated files depend on
// this, so it is worth pinning independently of running kubb.

const ARRAY_RESPONSE = {
  "200": { content: { "application/json": { schema: { type: "array" } } } },
};
const OBJECT_RESPONSE = {
  "200": { content: { "application/json": { schema: { type: "object" } } } },
};

const operation = (overrides: Partial<EsiOperation> = {}): EsiOperation => ({
  operationId: "GetCharactersCharacterIdFittings",
  security: [{ OAuth2: ["esi-fittings.read_fittings.v1"] }],
  responses: ARRAY_RESPONSE,
  ...overrides,
});

const describeAt = (route: string, overrides: Partial<EsiOperation> = {}) =>
  describeEndpoint(route, operation(overrides), {});

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

  it("marks an array response as not single", () => {
    expect(describeAt("/characters/{character_id}/fittings")?.single).toBe(
      false,
    );
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

    expect(source).toContain("QueryOptions(subjectId, {}, authHeaders)");
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
