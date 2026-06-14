import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react";

// ---------------------------------------------------------------------------
// apps/web/app/global-error.tsx is the App Router global error boundary. On
// mount it reports the error to Sentry and renders Next's generic NextError
// page inside an <html><body> shell. We mock Sentry to assert the capture and
// NextError to a sentinel so we can confirm it was rendered.
// ---------------------------------------------------------------------------

const mockCaptureException = jest.fn();
jest.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

jest.mock("next/error", () => ({
  __esModule: true,
  default: ({ statusCode }: { statusCode?: number }) => (
    <div data-testid="next-error">{`error-${statusCode}`}</div>
  ),
}));

describe("GlobalError boundary", () => {
  it("reports the error to Sentry and renders the NextError page", () => {
    const GlobalError = require("~/app/global-error").default;
    const error = Object.assign(new Error("kaboom"), { digest: "abc123" });

    const { getByTestId } = render(
      <GlobalError error={error} reset={jest.fn()} />,
    );

    // Sentry receives the exact error instance.
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(error);

    // NextError rendered with statusCode 0 (App Router has no status code).
    const nextError = getByTestId("next-error");
    expect(nextError).toBeInTheDocument();
    expect(nextError).toHaveTextContent("error-0");
  });
});
