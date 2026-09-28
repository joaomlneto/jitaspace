import type { PropsWithChildren } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react";

// The app's QueryClient: how many get built, and the defaults every query
// inherits. @swc/jest does not hoist jest.mock, so the provider and the
// mocked module are required lazily, after the mocks below are registered.
const mockConstructed = jest.fn();

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  class CountingQueryClient extends actual.QueryClient {
    constructor(...args: ConstructorParameters<typeof actual.QueryClient>) {
      super(...args);
      mockConstructed();
    }
  }
  return { ...actual, QueryClient: CountingQueryClient };
});

jest.mock("@jitaspace/esi-client", () => ({
  setAcceptLanguage: () => undefined,
  setUserAgent: () => undefined,
}));

jest.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => null,
}));

jest.mock("@tanstack/react-query-next-experimental", () => ({
  ReactQueryStreamedHydration: ({ children }: PropsWithChildren) => children,
}));

const { MyQueryClientProvider } =
  require("~/lib/MyQueryClientProvider") as typeof import("~/lib/MyQueryClientProvider");
const { useQueryClient } =
  require("@tanstack/react-query") as typeof import("@tanstack/react-query");
const { shouldRetryQuery } =
  require("~/lib/queryRetry") as typeof import("~/lib/queryRetry");

describe("MyQueryClientProvider's QueryClient", () => {
  it("is built once, however often the provider re-renders", () => {
    // `useState(new QueryClient())` built and discarded a client — with its
    // query and mutation caches — on every render.
    mockConstructed.mockClear();
    const { rerender } = render(
      <MyQueryClientProvider esiUserAgent="a">
        <div />
      </MyQueryClientProvider>,
    );
    rerender(
      <MyQueryClientProvider esiUserAgent="b">
        <div />
      </MyQueryClientProvider>,
    );
    rerender(
      <MyQueryClientProvider esiUserAgent="c">
        <div />
      </MyQueryClientProvider>,
    );

    expect(mockConstructed).toHaveBeenCalledTimes(1);
  });

  it("gives every query the ESI-aware retry policy", () => {
    let retry: unknown;
    const Probe = () => {
      retry = useQueryClient().getDefaultOptions().queries?.retry;
      return null;
    };

    render(
      <MyQueryClientProvider>
        <Probe />
      </MyQueryClientProvider>,
    );

    expect(retry).toBe(shouldRetryQuery);
  });
});
