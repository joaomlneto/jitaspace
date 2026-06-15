import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import type { CharacterWalletJournalEntry } from "@jitaspace/hooks";

// WalletTable takes `entries` directly (no internal data hook). Rendering the
// real mantine-react-table with rows executes the module-scope Cell renderers.
// @jitaspace/ui supplies the ISKAmount / EveEntity* / date children — stub them
// to no-ops; the assertable text (balance "… ISK", description, reason, and the
// context-type Badge) is produced by the cells themselves.
jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);

// Minimal shape — the table reads a subset of fields. Cast through unknown so we
// don't have to satisfy the full generated ESI response type.
const ENTRY_POSITIVE = {
  id: 5001,
  date: "2024-01-01T12:00:00Z",
  context_id: 88,
  context_id_type: "market_transaction_id",
  first_party_id: 100,
  second_party_id: 200,
  amount: 1500.5,
  balance: 1000000,
  description: "Market escrow released",
  reason: "trade",
  tax: 0,
  tax_receiver_id: 300,
} as unknown as CharacterWalletJournalEntry;

// Negative amount + no context type / tax receiver exercises the other branches
// (OtherPartyCell picks second_party_id when amount<0; ContextTypeCell and
// TaxReceiverCell return undefined when their ids are absent).
const ENTRY_NEGATIVE = {
  id: 5002,
  date: "2024-01-02T12:00:00Z",
  context_id: undefined,
  context_id_type: undefined,
  first_party_id: 400,
  second_party_id: 500,
  amount: -250,
  balance: 999750,
  description: "Brokers fee",
  reason: "",
  tax: 0,
  tax_receiver_id: undefined,
} as unknown as CharacterWalletJournalEntry;

function renderTable(entries: CharacterWalletJournalEntry[]) {
  const { WalletTable } = require("~/components/Wallet/WalletTable");
  return render(
    <MantineProvider>
      <WalletTable entries={entries} />
    </MantineProvider>,
  );
}

describe("WalletTable", () => {
  it("renders without crashing for an empty journal", () => {
    renderTable([]);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders the balance cell with locale formatting and ISK suffix", () => {
    renderTable([ENTRY_POSITIVE]);
    // Cell: `${row.original.balance?.toLocaleString()} ISK`
    expect(screen.getByText("1,000,000 ISK")).toBeInTheDocument();
  });

  it("renders the description and reason cells", () => {
    renderTable([ENTRY_POSITIVE]);
    expect(screen.getByText("Market escrow released")).toBeInTheDocument();
    expect(screen.getByText("trade")).toBeInTheDocument();
  });

  it("renders the context-type Badge with underscores replaced by spaces", () => {
    renderTable([ENTRY_POSITIVE]);
    // ContextTypeCell: context_id_type.replaceAll("_", " ")
    expect(screen.getByText("market transaction id")).toBeInTheDocument();
  });

  it("renders multiple rows including a negative-amount entry", () => {
    renderTable([ENTRY_POSITIVE, ENTRY_NEGATIVE]);
    // Two distinct balance cells render -> both rows present
    expect(screen.getByText("1,000,000 ISK")).toBeInTheDocument();
    expect(screen.getByText("999,750 ISK")).toBeInTheDocument();
    expect(screen.getByText("Brokers fee")).toBeInTheDocument();
  });

  // The firstParty / secondParty / taxReceiverId columns are hidden by default
  // (initialState.columnVisibility). Toggling them on via MRT's show/hide-columns
  // menu makes their Cell renderers (FirstPartyCell / SecondPartyCell /
  // TaxReceiverCell) execute for every row. Their inner @jitaspace/ui children
  // are no-op-stubbed, so we assert on the now-visible table column headers
  // (proof the columns mounted and their Cells ran) rather than cell text.
  //
  // MRT's menu items pair the header text with a Mantine Switch but don't wire
  // them via a `for`/aria-label association, so we locate the switch by climbing
  // from the header-text node to the nearest element containing it.
  function toggleColumn(label: string) {
    // The header text also appears in the table header, so pick the occurrence
    // that lives inside the open column-visibility menu, then climb to its switch.
    const labelNode = screen
      .getAllByText(label)
      .find((node) => node.closest('[role="menu"]') !== null);
    if (!labelNode) {
      throw new Error(`No menu entry found for column "${label}"`);
    }
    let el: HTMLElement | null = labelNode;
    for (let i = 0; i < 8 && el; i++) {
      const sw = el.querySelector('[role="switch"]');
      if (sw) {
        fireEvent.click(sw);
        return;
      }
      el = el.parentElement;
    }
    throw new Error(`Could not find a visibility switch for column "${label}"`);
  }

  it("executes the hidden First/Second-Party and Tax-Receiver cells when their columns are toggled on", async () => {
    // ENTRY_POSITIVE carries first/second party + tax_receiver ids so all three
    // cells hit their populated branch (TaxReceiverCell needs tax_receiver_id).
    const table = renderTable([ENTRY_POSITIVE]).getByRole("table");

    // These columns start hidden -> their headers are absent from the table.
    expect(within(table).queryByText("First Party")).not.toBeInTheDocument();
    expect(within(table).queryByText("Second Party")).not.toBeInTheDocument();
    expect(within(table).queryByText("Tax Receiver")).not.toBeInTheDocument();

    // Open MRT's "Show/Hide columns" menu from the top toolbar.
    fireEvent.click(
      screen.getByRole("button", { name: /show.*hide columns/i }),
    );
    await screen.findAllByRole("switch");

    toggleColumn("First Party");
    toggleColumn("Second Party");
    toggleColumn("Tax Receiver");

    // Once visible, the column headers render in the table (Cells have executed).
    await waitFor(() => {
      expect(within(table).getByText("First Party")).toBeInTheDocument();
      expect(within(table).getByText("Second Party")).toBeInTheDocument();
      expect(within(table).getByText("Tax Receiver")).toBeInTheDocument();
    });
  });
});
