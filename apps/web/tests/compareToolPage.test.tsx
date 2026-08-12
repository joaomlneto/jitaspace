import "@testing-library/jest-dom/jest-globals";

import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import { captureMock } from "../__mocks__/posthogMocks";

// The compare page wires the EsiSearchMultiSelect's onChange to update the
// selected type ids and capture a `compare_items_searched` event when items are
// ADDED (not removed). Stub the multiselect with buttons that drive onChange.
jest.mock("@jitaspace/eve-components", () => ({
  EsiSearchMultiSelect: ({
    onChange,
  }: {
    onChange?: (values: string[]) => void;
  }) => (
    <div>
      <button data-testid="add-two" onClick={() => onChange?.(["34", "35"])}>
        add two
      </button>
      <button data-testid="add-same" onClick={() => onChange?.(["34", "35"])}>
        no change
      </button>
    </div>
  ),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  CompareToolIcon: () => <span data-testid="compare-icon" />,
}));

jest.mock("~/components/Compare", () => ({
  CompareTable: ({ typeIds }: { typeIds: number[] }) => (
    <div data-testid="compare-table">{`types:${typeIds.join(",")}`}</div>
  ),
}));

function renderPage(
  adapter: { searchParams?: string; onUrlUpdate?: OnUrlUpdateFunction } = {},
) {
  const Page = require("~/app/compare/page").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
    // The selected types are nuqs-backed.
    { wrapper: withNuqsTestingAdapter({ hasMemory: true, ...adapter }) },
  );
}

describe("Compare tool page", () => {
  beforeEach(() => {
    captureMock.mockClear();
  });

  it("captures compare_items_added only when items are added", () => {
    renderPage();
    expect(screen.getByTestId("compare-icon")).toBeInTheDocument();

    // Adding two types (from an empty selection) fires the event.
    fireEvent.click(screen.getByTestId("add-two"));
    expect(screen.getByTestId("compare-table")).toHaveTextContent(
      "types:34,35",
    );
    expect(captureMock).toHaveBeenCalledWith("compare_items_added", {
      type_ids: [34, 35],
      item_count: 2,
    });

    // Re-selecting the same two (no net addition) does NOT fire again.
    captureMock.mockClear();
    fireEvent.click(screen.getByTestId("add-same"));
    expect(captureMock).not.toHaveBeenCalled();
  });
});

describe("Compare tool page URL sync", () => {
  it("restores the compared types from the URL on load", () => {
    renderPage({ searchParams: "?types=34,35" });

    expect(screen.getByTestId("compare-table")).toHaveTextContent(
      "types:34,35",
    );
  });

  it("writes the selected types to the URL", async () => {
    const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
    renderPage({ onUrlUpdate });

    fireEvent.click(screen.getByTestId("add-two"));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe("?types=34,35");
  });

  // The integer item-parser validates URL input, so a hand-edited id can never
  // reach the type lookups as NaN.
  it("drops unparseable type ids from the URL", () => {
    renderPage({ searchParams: "?types=abc,35" });

    expect(screen.getByTestId("compare-table")).toHaveTextContent("types:35");
  });
});
