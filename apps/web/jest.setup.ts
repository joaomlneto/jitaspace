import { TextDecoder, TextEncoder } from "util";

Object.assign(global, { TextEncoder, TextDecoder });

// Mantine / floating-ui require these browser APIs in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Guarded so this setup is also safe in `@jest-environment node` test files,
// which have no `window` (e.g. route-handler / server-action unit tests).
if (typeof window !== "undefined") {
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
}

// Defer rAF callbacks like a real browser — calling synchronously causes
// flushSync-inside-render errors when Mantine's Transition component fires.
global.requestAnimationFrame = (cb) => {
  return setTimeout(() => cb(performance.now()), 0) as unknown as number;
};
global.cancelAnimationFrame = (id) => clearTimeout(id);
