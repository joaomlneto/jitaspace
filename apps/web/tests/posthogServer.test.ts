/**
 * @jest-environment node
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";

// getPostHogClient reads the token from ~/env at call time; mock it with a
// stable object we mutate per test.
const mockEnv: Record<string, string | undefined> = {};
jest.mock("~/env", () => ({ env: mockEnv }));

// Loaded lazily so the ~/env mock (and mockEnv) are in place first.
const loadGetClient = () =>
  (
    require("../lib/posthog-server") as {
      getPostHogClient: () => { capture: unknown; shutdown: unknown } | null;
    }
  ).getPostHogClient;

describe("getPostHogClient", () => {
  afterEach(() => {
    delete mockEnv.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    delete mockEnv.NEXT_PUBLIC_POSTHOG_HOST;
  });

  it("returns null when no project token is configured", () => {
    expect(loadGetClient()()).toBeNull();
  });

  it("returns a usable client when a project token is configured", () => {
    mockEnv.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test_token";
    mockEnv.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";

    const client = loadGetClient()();

    expect(client).not.toBeNull();
    expect(typeof client?.capture).toBe("function");
    expect(typeof client?.shutdown).toBe("function");
  });
});
