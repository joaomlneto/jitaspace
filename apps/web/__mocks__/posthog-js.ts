/**
 * Lightweight stub for posthog-js used in jest tests. Mapped via
 * moduleNameMapper so every `import posthog from "posthog-js"` resolves to this
 * stub — capture/identify become assertable jest.fn()s and no real SDK is
 * initialized (no network/console noise).
 *
 * The jest.fn() instances live in ./posthogMocks so tests can import them by
 * name and assert on a standalone reference.
 */
import {
  captureExceptionMock,
  captureMock,
  identifyMock,
  initMock,
  resetMock,
} from "./posthogMocks";

const posthog = {
  init: initMock,
  capture: captureMock,
  identify: identifyMock,
  captureException: captureExceptionMock,
  reset: resetMock,
};

export default posthog;
