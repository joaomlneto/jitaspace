import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

import type * as Module from "../src/hooks/contracts/useAuthenticatedContract";

// @swc/jest does not hoist jest.mock above imports, so the hook under test is
// required lazily below. Both hooks it composes are replaced: what is under
// test is which contract it picks out, and which listing it reads it through.
const listings = {
  isPending: false,
  data: [
    {
      contract_id: 1,
      type: "item_exchange",
      sources: [{ kind: "character", subjectId: 1001 }],
    },
    {
      contract_id: 2,
      type: "auction",
      sources: [
        { kind: "corporation", subjectId: 2001 },
        { kind: "character", subjectId: 1002 },
      ],
    },
  ],
};
jest.mock("../src/hooks/contracts/useAuthenticatedContracts", () => ({
  __esModule: true,
  useAuthenticatedContracts: () => listings,
}));

const details = {
  items: [{ record_id: 7 }],
  bids: [{ bid_id: 9 }],
  isLoading: true,
  error: null as Error | null,
};
const mockUseContractItemsAndBids = jest.fn((..._args: unknown[]) => details);
jest.mock("../src/hooks/contracts/useContractItemsAndBids", () => ({
  __esModule: true,
  useContractItemsAndBids: (...args: unknown[]) =>
    mockUseContractItemsAndBids(...args),
}));

const { useAuthenticatedContract } =
  require("../src/hooks/contracts/useAuthenticatedContract") as typeof Module;

beforeEach(() => {
  mockUseContractItemsAndBids.mockClear();
  listings.isPending = false;
});

describe("useAuthenticatedContract", () => {
  it("reads a contract's details through the first listing it came from", () => {
    const { result } = renderHook(() => useAuthenticatedContract(2));

    expect(result.current.contract?.contract_id).toBe(2);
    expect(result.current.source).toEqual({
      kind: "corporation",
      subjectId: 2001,
    });
    expect(mockUseContractItemsAndBids).toHaveBeenLastCalledWith(
      2,
      { kind: "corporation", subjectId: 2001 },
      { isAuction: true },
    );
    expect(result.current.items).toBe(details.items);
    expect(result.current.bids).toBe(details.bids);
    expect(result.current.isLoadingDetails).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("asks for no bids for a contract that is not an auction", () => {
    renderHook(() => useAuthenticatedContract(1));

    expect(mockUseContractItemsAndBids).toHaveBeenLastCalledWith(
      1,
      { kind: "character", subjectId: 1001 },
      { isAuction: false },
    );
  });

  it("holds the details of a contract no listing has", () => {
    const { result } = renderHook(() => useAuthenticatedContract(3));

    expect(result.current.contract).toBeUndefined();
    expect(result.current.source).toBeUndefined();
    expect(mockUseContractItemsAndBids).toHaveBeenLastCalledWith(
      undefined,
      undefined,
      { isAuction: false },
    );
  });

  it("looks nothing up without a contract id", () => {
    const { result } = renderHook(() => useAuthenticatedContract(undefined));

    expect(result.current.contract).toBeUndefined();
    expect(mockUseContractItemsAndBids).toHaveBeenLastCalledWith(
      undefined,
      undefined,
      { isAuction: false },
    );
  });

  it("stays pending while the listings load", () => {
    listings.isPending = true;
    const { result } = renderHook(() => useAuthenticatedContract(3));

    expect(result.current.isPending).toBe(true);
    expect(result.current.contract).toBeUndefined();
  });
});
