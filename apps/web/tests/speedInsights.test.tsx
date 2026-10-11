import "@testing-library/jest-dom/jest-globals";

import type * as ReactModule from "react";
import { act } from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import type * as SpeedInsightsModule from "~/components/SpeedInsights";

const mockVendorRenders = jest.fn();

// The real component reads `useSearchParams()`, which is what must never run
// on the server; a marker stands in for it.
jest.mock("@vercel/speed-insights/next", () => {
  const React = require("react") as typeof ReactModule;
  return {
    SpeedInsights: () => {
      mockVendorRenders();
      return React.createElement("span", null, "speed-insights");
    },
  };
});

const { SpeedInsights } =
  require("~/components/SpeedInsights") as typeof SpeedInsightsModule;

afterEach(() => {
  mockVendorRenders.mockClear();
  jest.restoreAllMocks();
});

describe("SpeedInsights", () => {
  it("renders nothing on the server, so its navigation hooks never run there", () => {
    expect(renderToString(<SpeedInsights />)).toBe("");
    expect(mockVendorRenders).not.toHaveBeenCalled();
  });

  it("mounts the Vercel component in the browser", () => {
    render(<SpeedInsights />);
    expect(screen.getByText("speed-insights")).toBeInTheDocument();
  });

  it("hydrates the empty server HTML without a mismatch", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const container = document.createElement("div");
    container.innerHTML = renderToString(<SpeedInsights />);
    document.body.appendChild(container);

    await act(async () => {
      hydrateRoot(container, <SpeedInsights />);
      await Promise.resolve();
    });

    expect(container).toHaveTextContent("speed-insights");
    expect(consoleError).not.toHaveBeenCalled();
    container.remove();
  });
});
