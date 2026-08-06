import { describe, expect, it } from "@jest/globals";

// Imported from the standalone pure module, which pulls in no runtime deps — so
// unlike the other job tests this needs no p-limit / env mocks.
import { flattenContributionParameters } from "../jobs/scrape/sde/militaryCampaignParameters";

const OBJECTIVE = "017e24a3-4495-4c2b-8551-b451099dbc55";

describe("flattenContributionParameters", () => {
  it("returns nothing for an objective with no parameters", () => {
    expect(flattenContributionParameters(OBJECTIVE, [])).toEqual({
      parameters: [],
      parameterValues: [],
    });
  });

  it("keys matcher values by (matcherIndex, valueIndex)", () => {
    const { parameters, parameterValues } = flattenContributionParameters(
      OBJECTIVE,
      [
        {
          key: "agent_level",
          matcher: {
            values: [{ valueType: "agent_level", values: ["1", "2"] }],
          },
        },
      ],
    );

    expect(parameters).toEqual([
      {
        militaryCampaignObjectiveId: OBJECTIVE,
        paramKey: "agent_level",
        isDeleted: false,
      },
    ]);
    expect(parameterValues).toEqual([
      {
        militaryCampaignObjectiveId: OBJECTIVE,
        paramKey: "agent_level",
        matcherIndex: 0,
        valueIndex: 0,
        valueType: "agent_level",
        value: "1",
        isDeleted: false,
      },
      {
        militaryCampaignObjectiveId: OBJECTIVE,
        paramKey: "agent_level",
        matcherIndex: 0,
        valueIndex: 1,
        valueType: "agent_level",
        value: "2",
        isDeleted: false,
      },
    ]);
  });

  it("keeps a matcher that names a valueType but carries no values", () => {
    // CCP ships e.g. { valueType: "corporation" } with no `values`. Dropping it
    // would lose the valueType, so it becomes one row with a null value.
    const { parameterValues } = flattenContributionParameters(OBJECTIVE, [
      {
        key: "agent_identity",
        matcher: {
          values: [
            { valueType: "corporation" },
            { valueType: "faction", values: ["500001"] },
          ],
        },
      },
    ]);

    expect(parameterValues).toEqual([
      expect.objectContaining({
        matcherIndex: 0,
        valueIndex: 0,
        valueType: "corporation",
        value: null,
      }),
      expect.objectContaining({
        matcherIndex: 1,
        valueIndex: 0,
        valueType: "faction",
        value: "500001",
      }),
    ]);
  });

  it("skips parameters with no key, and defaults a missing valueType", () => {
    const { parameters, parameterValues } = flattenContributionParameters(
      OBJECTIVE,
      [
        { matcher: { values: [{ valueType: "ignored", values: ["x"] }] } },
        { key: "kept", matcher: { values: [{ values: ["y"] }] } },
      ],
    );

    expect(parameters.map((p) => p.paramKey)).toEqual(["kept"]);
    expect(parameterValues).toHaveLength(1);
    expect(parameterValues[0]).toEqual(
      expect.objectContaining({ paramKey: "kept", valueType: "", value: "y" }),
    );
  });

  it("stringifies numeric matcher values", () => {
    const { parameterValues } = flattenContributionParameters(OBJECTIVE, [
      {
        key: "agent_division",
        // The SDE ships these as strings, but be robust to numbers.
        matcher: {
          values: [{ valueType: "agent_division", values: [22 as never] }],
        },
      },
    ]);

    expect(parameterValues[0]?.value).toBe("22");
  });

  it("handles a parameter whose matcher is absent entirely", () => {
    const { parameters, parameterValues } = flattenContributionParameters(
      OBJECTIVE,
      [{ key: "bare" }],
    );

    expect(parameters).toHaveLength(1);
    expect(parameterValues).toEqual([]);
  });
});
