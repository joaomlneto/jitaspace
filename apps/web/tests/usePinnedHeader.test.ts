import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";

import { usePinnedHeader } from "~/layouts/MainLayout/usePinnedHeader";

function scrollTo(y: number) {
  act(() => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
  });
}

function setup(options?: Parameters<typeof usePinnedHeader>[0]) {
  scrollTo(0);
  let renders = 0;
  const hook = renderHook(() => {
    renders += 1;
    return usePinnedHeader(options);
  });
  return { ...hook, renders: () => renders };
}

describe("usePinnedHeader", () => {
  it("stays pinned inside the fixed zone, whatever the direction", () => {
    const { result } = setup({ fixedAt: 120 });
    scrollTo(100);
    scrollTo(50);
    scrollTo(120);
    expect(result.current).toBe(true);
  });

  it("hides after scrolling down `scrollDistance` past the fixed zone", () => {
    const { result } = setup({ fixedAt: 120, scrollDistance: 100 });
    scrollTo(200);
    expect(result.current).toBe(true);
    scrollTo(219);
    expect(result.current).toBe(true);
    scrollTo(220);
    expect(result.current).toBe(false);
  });

  it("measures from `fixedAt` when a single jump leaves the fixed zone", () => {
    const { result } = setup({ fixedAt: 120, scrollDistance: 100 });
    scrollTo(100);
    scrollTo(219);
    expect(result.current).toBe(true);
  });

  it("reveals as soon as the user scrolls back up", () => {
    const { result } = setup({ fixedAt: 120 });
    scrollTo(1000);
    expect(result.current).toBe(false);
    scrollTo(999);
    expect(result.current).toBe(true);
    // Having refilled only 1px, 1px back down hides it again.
    scrollTo(1000);
    expect(result.current).toBe(false);
  });

  it("re-pins on returning to the fixed zone", () => {
    const { result } = setup({ fixedAt: 120 });
    scrollTo(1000);
    expect(result.current).toBe(false);
    scrollTo(5000);
    scrollTo(0);
    expect(result.current).toBe(true);
  });

  it("does not re-render while scrolling without a change of state", () => {
    const { renders } = setup({ fixedAt: 120 });
    const initial = renders();
    // Inside the fixed zone, and then hidden for good: two state changes at
    // most (the hide), not one per scroll event.
    for (let y = 0; y <= 2000; y += 10) scrollTo(y);
    expect(renders() - initial).toBeLessThanOrEqual(2);
  });

  it("removes the same scroll listener it added on unmount", () => {
    const add = jest.spyOn(window, "addEventListener");
    const remove = jest.spyOn(window, "removeEventListener");
    try {
      const { unmount } = setup({ fixedAt: 120 });
      const added = add.mock.calls.find(([type]) => type === "scroll")?.[1];
      if (!added) throw new Error("no scroll listener was added");
      unmount();
      expect(remove).toHaveBeenCalledWith("scroll", added);
    } finally {
      add.mockRestore();
      remove.mockRestore();
    }
  });
});
