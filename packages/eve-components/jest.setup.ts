import "@testing-library/jest-dom/jest-globals";

import { TextDecoder, TextEncoder } from "util";

Object.assign(global, { TextEncoder, TextDecoder });

// jsdom does not implement ResizeObserver or matchMedia — Mantine requires both
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mantine's Combobox/Popover (via @floating-ui) queues rAF callbacks for
// positioning. Running them synchronously prevents open-handle warnings.
global.requestAnimationFrame = (cb) => {
  cb(performance.now());
  return 0;
};
global.cancelAnimationFrame = () => {};
