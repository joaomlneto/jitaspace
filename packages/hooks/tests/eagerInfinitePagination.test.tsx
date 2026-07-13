import { describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

const { useEagerlyFetchAllPages } =
  require("../src/hooks/utils/useEagerlyFetchAllPages") as typeof import("../src/hooks/utils/useEagerlyFetchAllPages");
const { esiInfiniteQueryNextPageParam } =
  require("../src/hooks/utils/esiInfiniteQueryNextPageParam") as typeof import("../src/hooks/utils/esiInfiniteQueryNextPageParam");

describe("useEagerlyFetchAllPages", () => {
  it("requests the next page while more pages remain", () => {
    const fetchNextPage = jest.fn(() => Promise.resolve());

    renderHook(() =>
      useEagerlyFetchAllPages({ hasNextPage: true, fetchNextPage }),
    );

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does not request anything once the last page is loaded", () => {
    const fetchNextPage = jest.fn(() => Promise.resolve());

    renderHook(() =>
      useEagerlyFetchAllPages({ hasNextPage: false, fetchNextPage }),
    );

    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});

describe("esiInfiniteQueryNextPageParam", () => {
  const pageWith = (xPages?: string) => ({
    headers: xPages === undefined ? {} : { "x-pages": xPages },
  });

  it("advances to the next 1-based page until x-pages is reached", () => {
    expect(esiInfiniteQueryNextPageParam(pageWith("3"), [{}])).toBe(2);
    expect(esiInfiniteQueryNextPageParam(pageWith("3"), [{}, {}])).toBe(3);
  });

  it("returns undefined once every page has been loaded", () => {
    expect(
      esiInfiniteQueryNextPageParam(pageWith("3"), [{}, {}, {}]),
    ).toBeUndefined();
  });

  it("returns undefined when the x-pages header is absent", () => {
    expect(esiInfiniteQueryNextPageParam(pageWith(), [])).toBeUndefined();
  });
});
