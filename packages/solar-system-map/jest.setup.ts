import { beforeEach, jest } from "@jest/globals";

import "@testing-library/jest-dom/jest-globals";

// jsdom implements <canvas> but never a WebGL context, so the map's capability
// probe would report "unsupported" for every test and suppress the scene. Hand
// back a stub context for the WebGL ids so the suite runs as a capable browser;
// the tests that cover the unsupported path override this themselves.
//
// This has to be re-installed per test rather than set once at module scope:
// `restoreMocks` (jest.config.ts) restores every mock before each test.
beforeEach(() => {
  jest
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation((contextId: string) =>
      contextId === "webgl" || contextId === "webgl2"
        ? ({} as RenderingContext)
        : null,
    );
});
