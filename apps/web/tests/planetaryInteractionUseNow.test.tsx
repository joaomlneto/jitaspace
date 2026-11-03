import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";

describe("useNow", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse("2026-11-01T12:00:00Z") });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const { useNow } =
    require("~/components/PlanetaryInteraction/useNow") as typeof import("~/components/PlanetaryInteraction/useNow");

  it("reads the clock in the browser and ticks every 30 seconds", () => {
    const { result } = renderHook(() => useNow());
    const first = result.current;
    expect(first).toEqual(expect.any(Number));

    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    expect(result.current).toBe((first ?? 0) + 30_000);
  });

  it("stops ticking once nothing is listening", () => {
    const { unmount } = renderHook(() => useNow());
    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });

  it("reads the clock afresh when it is used again after a quiet spell", () => {
    const first = renderHook(() => useNow());
    const before = first.result.current ?? 0;
    first.unmount();

    // Two hours elsewhere, with nothing listening and so nothing ticking.
    jest.setSystemTime(before + 2 * 60 * 60 * 1000);
    const rendered: (number | null)[] = [];
    renderHook(() => {
      const now = useNow();
      rendered.push(now);
      return now;
    });

    // Every render, the very first included: one painted with the old
    // reading would judge two hours of extractors as still running.
    expect(rendered.length).toBeGreaterThan(0);
    expect(new Set(rendered)).toEqual(new Set([before + 2 * 60 * 60 * 1000]));
  });

  it("is null while prerendering, so a static page stays static", () => {
    function Clock() {
      const now = useNow();
      return <span>{now === null ? "no clock" : "clock"}</span>;
    }

    expect(renderToString(<Clock />)).toContain("no clock");
  });
});
