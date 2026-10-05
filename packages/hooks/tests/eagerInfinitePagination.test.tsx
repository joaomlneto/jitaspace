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

  it("walks only while the query is enabled", () => {
    // fetchNextPage is imperative and ignores the query's `enabled`.
    const fetchNextPage = jest.fn(() => Promise.resolve());

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useEagerlyFetchAllPages({
          data: { pages: [{}] },
          hasNextPage: true,
          fetchNextPage,
          enabled,
        }),
      { initialProps: { enabled: false } },
    );
    expect(fetchNextPage).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("requests one more page each time a page lands, not just once", () => {
    // hasNextPage is true from the first page to the second-to-last, and
    // fetchNextPage keeps its identity, so an effect keyed on those two alone
    // fired once and the walk stopped at page 2. Keying on the loaded page
    // count is what makes each landed page request the next one.
    const fetchNextPage = jest.fn(() => Promise.resolve());
    const pages = (n: number) => ({ pages: Array.from({ length: n }) });

    const { rerender } = renderHook(
      ({ loaded }: { loaded: number }) =>
        useEagerlyFetchAllPages({
          data: pages(loaded),
          hasNextPage: true,
          fetchNextPage,
        }),
      { initialProps: { loaded: 1 } },
    );
    rerender({ loaded: 2 });
    rerender({ loaded: 3 });

    expect(fetchNextPage).toHaveBeenCalledTimes(3);
  });

  it("stops on a failed page and resumes once the error clears", () => {
    const fetchNextPage = jest.fn(() => Promise.resolve());
    const data = { pages: [{}, {}] };

    const { rerender } = renderHook(
      ({ error }: { error: unknown }) =>
        useEagerlyFetchAllPages({
          data,
          error,
          hasNextPage: true,
          fetchNextPage,
        }),
      { initialProps: { error: null as unknown } },
    );
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    // A failed page must not be re-requested on every render against an API
    // that rate-limits on errors.
    rerender({ error: new Error("page 3 failed") });
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    // A later successful refetch clears the error; the walk picks up again
    // instead of leaving hasNextPage true for good.
    rerender({ error: null });
    expect(fetchNextPage).toHaveBeenCalledTimes(2);
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
