import { describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

import type * as Module from "../src/hooks/contracts/useAuthenticatedContracts";

// @swc/jest does not hoist jest.mock above imports, so the hook under test is
// required lazily below. The two generated fan-outs are replaced with fixed
// results: what is under test is how their lists are merged.
const envelope = {
  isLoading: false,
  isPending: false,
  isError: false,
};
const characterError = { subjectId: 1003, error: new Error("403") };
const corporationError = { subjectId: 2002, error: new Error("403") };
const characterContracts = {
  ...envelope,
  isError: true,
  errors: [characterError],
  refetch: jest.fn(),
  subjectIds: [1001],
  data: [
    { contract_id: 1, issuer_id: 1001, subjectId: 1001 },
    { contract_id: 2, issuer_id: 1001, subjectId: 1001 },
  ],
};
const corporationContracts = {
  ...envelope,
  errors: [corporationError],
  refetch: jest.fn(),
  subjectIds: [2001],
  isPending: true,
  isLoading: true,
  data: [
    { contract_id: 2, issuer_id: 1001, subjectId: 2001 },
    { contract_id: 3, issuer_id: 1002, subjectId: 2001 },
  ],
};
jest.mock("../src/generated/multi", () => ({
  __esModule: true,
  useMultipleCharacterContracts: () => characterContracts,
  useMultipleCorporationContracts: () => corporationContracts,
}));

const { useAuthenticatedContracts } =
  require("../src/hooks/contracts/useAuthenticatedContracts") as typeof Module;

describe("useAuthenticatedContracts", () => {
  it("lists each contract once, with every listing it came from", () => {
    const { result } = renderHook(() => useAuthenticatedContracts());

    expect(
      result.current.data.map(({ contract_id, sources }) => ({
        contract_id,
        sources,
      })),
    ).toEqual([
      { contract_id: 1, sources: [{ kind: "character", subjectId: 1001 }] },
      {
        contract_id: 2,
        // The character's listing leads: its endpoints need no corporation role.
        sources: [
          { kind: "character", subjectId: 1001 },
          { kind: "corporation", subjectId: 2001 },
        ],
      },
      { contract_id: 3, sources: [{ kind: "corporation", subjectId: 2001 }] },
    ]);
    // The per-item tag is folded into `sources`, not left on the contract.
    expect(result.current.data[0]).not.toHaveProperty("subjectId");
  });

  it("reports both fan-outs' subjects and stays pending until both settle", () => {
    const { result } = renderHook(() => useAuthenticatedContracts());

    expect(result.current.characterIds).toEqual([1001]);
    expect(result.current.corporationIds).toEqual([2001]);
    expect(result.current.isPending).toBe(true);
  });

  it("reports both fan-outs' loading and error flags", () => {
    const { result } = renderHook(() => useAuthenticatedContracts());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(true);
    // Each failure says which kind of listing it was.
    expect(result.current.errors).toEqual([
      { ...characterError, kind: "character" },
      { ...corporationError, kind: "corporation" },
    ]);
  });

  it("refetches both fan-outs", () => {
    const { result } = renderHook(() => useAuthenticatedContracts());

    result.current.refetch();

    expect(characterContracts.refetch).toHaveBeenCalledTimes(1);
    expect(corporationContracts.refetch).toHaveBeenCalledTimes(1);
  });
});
