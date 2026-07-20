/**
 * Shared jest.fn() instances backing the posthog-js stub (../__mocks__/posthog-js).
 *
 * Tests import these named mocks directly so assertions reference a standalone
 * const (`expect(captureMock)...`) rather than an unbound member access
 * (`expect(posthog.capture)...`, which the lint config rejects). Because the
 * posthog-js stub re-uses these same instances, asserting here observes the
 * calls the app code made through `import posthog from "posthog-js"`.
 */
import { jest } from "@jest/globals";

export const initMock = jest.fn();
export const captureMock = jest.fn();
export const identifyMock = jest.fn();
export const captureExceptionMock = jest.fn();
export const resetMock = jest.fn();
