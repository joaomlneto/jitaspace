import "@testing-library/jest-dom/jest-globals";
import { TextDecoder, TextEncoder } from "util";

Object.assign(global, { TextEncoder, TextDecoder });

// jsdom does not implement ResizeObserver or matchMedia — Mantine requires both
global.ResizeObserver = class ResizeObserver {
  observe() {
    /* no-op: jsdom has no layout engine */
  }
  unobserve() {
    /* no-op */
  }
  disconnect() {
    /* no-op */
  }
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {
      /* deprecated no-op */
    },
    removeListener: () => {
      /* deprecated no-op */
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
  /* no-op: rAF callbacks run synchronously above */
};
