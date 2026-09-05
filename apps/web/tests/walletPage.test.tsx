import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

// The page merges two multi-subject hooks. Both are argument-less and return a
// flat, already-tagged list — see defineMultiEsiQuery — so the mocks mirror that
// envelope rather than a raw ESI response.
const characterJournal = jest.fn();
const corporationJournal = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useMultipleCharacterWalletJournal: () => characterJournal(),
  useMultipleCorporationWalletJournal: () => corporationJournal(),
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));
jest.mock("@jitaspace/eve-components", () => ({
  EveEntityAvatar: () => null,
  // Rendering the id makes "which owner is this row" assertable without
  // resolving names over ESI.
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span>{`entity-${entityId}`}</span>
  ),
  EveEntityAnchor: ({ children }: { children?: ReactNode }) => children,
}));

const envelope = (data: unknown[], subjectIds: number[]) => ({
  data,
  subjectIds,
  errors: [],
  isLoading: false,
  isPending: false,
  isError: false,
  refetch: () => undefined,
});

const entry = (over: Record<string, unknown>) => ({
  id: 1,
  date: "2026-08-01T00:00:00Z",
  ref_type: "player_donation",
  description: "d",
  amount: 100,
  balance: 1000,
  ...over,
});

function renderPage(searchParams = "") {
  const Page = require("~/app/wallet/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams, hasMemory: true }) },
  );
}

describe("Wallet page", () => {
  beforeEach(() => {
    // No jest.resetModules() here: the page is lazy-required below, and a reset
    // registry hands it a second copy of React while testing-library keeps the
    // first — which surfaces as "Invalid hook call".
    characterJournal.mockReset();
    corporationJournal.mockReset();
    characterJournal.mockReturnValue(envelope([], []));
    corporationJournal.mockReturnValue(envelope([], []));
  });

  it("renders the heading and the height-reserving table", () => {
    const { container } = renderPage();

    expect(screen.getByRole("heading", { name: "Wallet" })).toBeInTheDocument();
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });

  it("merges character and corporation entries into one table, newest first", () => {
    characterJournal.mockReturnValue(
      envelope(
        [entry({ id: 1, subjectId: 90, date: "2026-08-01T00:00:00Z" })],
        [90],
      ),
    );
    corporationJournal.mockReturnValue(
      envelope(
        [
          entry({
            id: 1,
            subjectId: 98,
            division: 2,
            date: "2026-08-05T00:00:00Z",
          }),
        ],
        [98],
      ),
    );

    renderPage();

    // Both rows survive the merge even though they share ESI journal id 1 —
    // ids are only unique within one wallet.
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    // Newest first: the corporation entry is four days later.
    expect(rows[0]).toHaveTextContent("entity-98");
    expect(rows[1]).toHaveTextContent("entity-90");
  });

  it("shows the owner column only when more than one wallet contributes", () => {
    characterJournal.mockReturnValue(
      envelope([entry({ id: 1, subjectId: 90 })], [90]),
    );
    renderPage();

    // A single wallet would repeat the same name on every row.
    expect(
      screen.queryByRole("columnheader", { name: "Owner" }),
    ).not.toBeInTheDocument();
  });

  it("filters to the owners named in the URL", () => {
    characterJournal.mockReturnValue(
      envelope([entry({ id: 1, subjectId: 90, description: "mine" })], [90]),
    );
    corporationJournal.mockReturnValue(
      envelope(
        [entry({ id: 2, subjectId: 98, division: 1, description: "theirs" })],
        [98],
      ),
    );

    renderPage("?owners=character:90");

    // Identified by description, not by owner name: with the corporation
    // filtered out only one wallet contributes, so the Owner column correctly
    // does not render.
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("mine");
    expect(screen.queryByText("theirs")).not.toBeInTheDocument();
  });

  it("tells the user how to get access when no wallet is readable", () => {
    renderPage();
    expect(screen.getByText("No wallets available")).toBeInTheDocument();
  });

  it("names the wallets that failed instead of showing them as empty", () => {
    characterJournal.mockReturnValue({
      ...envelope([], [90]),
      isError: true,
      errors: [{ subjectId: 90, error: { message: "boom" } }],
    });

    renderPage();

    expect(
      screen.getByText("Some wallets could not be loaded"),
    ).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });
});
