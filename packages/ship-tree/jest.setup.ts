import "@testing-library/jest-dom/jest-globals";

import { TextDecoder, TextEncoder } from "util";

Object.assign(global, { TextEncoder, TextDecoder });

// Suites that opt into `@jest-environment node` (the data and filesystem ones)
// have no window to shim.
if (typeof window !== "undefined") {
  // jsdom implements neither ResizeObserver nor matchMedia, and both Mantine
  // and the ship tree's pan/zoom viewport use them.
  global.ResizeObserver = class ResizeObserver {
    observe() {
      /* no-op: jsdom never resizes, so there is nothing to observe */
    }
    unobserve() {
      /* no-op: nothing is observed, so nothing to stop observing */
    }
    disconnect() {
      /* no-op: no observations to tear down */
    }
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      // jsdom never fires media-query change events, so the listener
      // registration/removal methods are intentional no-ops.
      addListener: () => {
        /* no-op */
      },
      removeListener: () => {
        /* no-op */
      },
      addEventListener: () => {
        /* no-op */
      },
      removeEventListener: () => {
        /* no-op */
      },
      dispatchEvent: () => false,
    }),
  });
}
