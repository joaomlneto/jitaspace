/**
 * Lightweight stub for posthog-node used in jest tests. Each `new PostHog()`
 * yields an instance whose methods are jest.fn()s, so server-side analytics can
 * be exercised without a real client or network calls.
 */
import { jest } from "@jest/globals";

export class PostHog {
  capture = jest.fn();
  identify = jest.fn();
  flush = jest.fn(() => Promise.resolve(undefined));
  shutdown = jest.fn(() => Promise.resolve(undefined));
}
