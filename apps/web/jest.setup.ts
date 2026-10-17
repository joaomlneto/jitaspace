import { TextDecoder, TextEncoder } from "util";
import { jest } from "@jest/globals";

Object.assign(global, { TextEncoder, TextDecoder });

// Shared no-op for stubbed browser APIs that jsdom does not implement.
const noop = (): void => undefined;

// Mantine / floating-ui require these browser APIs in jsdom
global.ResizeObserver = class ResizeObserver {
  observe = noop;
  unobserve = noop;
  disconnect = noop;
};

// Mantine Carousel (embla-carousel) uses IntersectionObserver, which jsdom
// does not implement. A no-op stub lets carousel-bearing pages render in tests.
global.IntersectionObserver = class IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];
  observe = noop;
  unobserve = noop;
  disconnect = noop;
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
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
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
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

// The entity anchors (~/components/Anchor) get a stub by default, as they did
// when they lived in @jitaspace/ui and @jitaspace/eve-components, whose stubs
// are mapped in jest.config.ts. A moduleNameMapper rule cannot do it here:
// next/jest compiles the tsconfig `~/` alias into a relative path, so source
// files never import the literal "~/components/Anchor". jest.mock resolves the
// barrel to the same file those imports reach. A test can still override it
// with its own jest.mock("~/components/Anchor", factory), and a test that
// wants a real anchor imports its file (~/components/Anchor/TypeListAnchor).
jest.mock("~/components/Anchor", () =>
  jest.requireActual("./__mocks__/components/Anchor"),
);
