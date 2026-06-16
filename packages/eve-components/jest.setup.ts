import "@testing-library/jest-dom/jest-globals";

import { TextDecoder, TextEncoder } from "util";

Object.assign(global, { TextEncoder, TextDecoder });

// jsdom does not implement ResizeObserver or matchMedia — Mantine requires both
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

// Mantine's Combobox/Popover (via @floating-ui) queues rAF callbacks for
// positioning. Running them synchronously prevents open-handle warnings.
global.requestAnimationFrame = (cb) => {
  cb(performance.now());
  return 0;
};
global.cancelAnimationFrame = () => {
  /* no-op: rAF callbacks run synchronously above, so there is nothing to cancel */
};
