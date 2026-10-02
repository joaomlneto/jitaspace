import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { CharacterWalletJournalEntry } from "@jitaspace/hooks";

// WalletTable takes `entries` directly (no internal data hook). Rendering the
// real DataTable with rows executes the module-scope cell renderers.
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
  // transaction_tax has a description in the SDE -> Type cell takes its
  // tooltip branch.
  ref_type: "transaction_tax",
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
  // bounty_prizes has no SDE description -> Type cell takes its plain branch.
  ref_type: "bounty_prizes",
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

function renderTable(
  entries: CharacterWalletJournalEntry[],
  isLoading = false,
) {
  const { WalletTable } = require("~/components/Wallet/WalletTable");
  // env="test" turns off Mantine's transitions, so the filter dropdowns are
  // visible as soon as they open.
  return render(
    <MantineProvider env="test">
      <WalletTable entries={entries} isLoading={isLoading} />
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

  // The Type column filters via a multi-select, whose options and chosen pills
  // render the same labels outside the table body — so match a cell.
  function typeCell(label: string) {
    return screen
      .getAllByText(label)
      .find((node) => node.closest("td") !== null);
  }

  it("renders the entry type using EVE's own name for the ref_type", () => {
    renderTable([ENTRY_POSITIVE, ENTRY_NEGATIVE]);
    expect(typeCell("Transaction Tax")).toBeInTheDocument();
    expect(typeCell("Bounty Prizes")).toBeInTheDocument();
  });

  it("marks entry types that carry a description as hoverable", () => {
    renderTable([ENTRY_POSITIVE, ENTRY_NEGATIVE]);
    // Mantine's Tooltip only mounts its label once opened (and floating-ui does
    // not position in jsdom), so assert the affordance the tooltip branch adds
    // instead: transaction_tax has a description, bounty_prizes does not.
    expect(typeCell("Transaction Tax")).toHaveStyle({ cursor: "help" });
    expect(typeCell("Bounty Prizes")).not.toHaveStyle({ cursor: "help" });
  });

  describe("filtering by entry type", () => {
    const entry = (id: number, ref_type: string) =>
      ({ ...ENTRY_POSITIVE, id, ref_type }) as CharacterWalletJournalEntry;
    // "Brokers Fee" is a substring of both contract variants — one of 20 such
    // names in the generated table.
    const ENTRIES = [
      entry(1, "brokers_fee"),
      entry(2, "contract_brokers_fee"),
      entry(3, "contract_brokers_fee_corp"),
      entry(4, "transaction_tax"),
    ];
    const typeCells = () =>
      [
        "Brokers Fee",
        "Contract Brokers Fee",
        "Contract Brokers Fee (corp)",
        "Transaction Tax",
      ].filter((label) => typeCell(label) !== undefined);

    async function pickTypes(...labels: string[]) {
      await userEvent.click(
        screen.getByRole("button", { name: "Filter Type" }),
      );
      const input = await screen.findByRole("combobox", {
        name: "Filter Type",
      });
      for (const label of labels) {
        await userEvent.click(input);
        await userEvent.click(screen.getByRole("option", { name: label }));
      }
    }

    it("offers each entry type once, by its displayed name", async () => {
      renderTable(ENTRIES);
      await userEvent.click(
        screen.getByRole("button", { name: "Filter Type" }),
      );
      await userEvent.click(
        await screen.findByRole("combobox", { name: "Filter Type" }),
      );
      expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
        "Brokers Fee",
        "Contract Brokers Fee",
        "Contract Brokers Fee (corp)",
        "Transaction Tax",
      ]);
    });

    it("keeps only the selected entry type, not every type containing its name", async () => {
      // A substring match ran String.prototype.includes against the display
      // name — so picking "Brokers Fee" also kept both contract broker fees.
      renderTable(ENTRIES);
      await pickTypes("Brokers Fee");
      expect(typeCells()).toEqual(["Brokers Fee"]);
    });

    it("keeps every selected entry type", async () => {
      renderTable(ENTRIES);
      await pickTypes("Brokers Fee", "Transaction Tax");
      expect(typeCells()).toEqual(["Brokers Fee", "Transaction Tax"]);
    });

    it("shows every row again once the filter is cleared", async () => {
      renderTable(ENTRIES);
      await pickTypes("Brokers Fee");
      await userEvent.click(
        screen.getByRole("button", { name: "Clear filters (1)" }),
      );
      expect(typeCells()).toHaveLength(4);
    });

    it("shows every row when the last selected type is removed", async () => {
      // An emptied selection has to mean "no filter" rather than "match
      // nothing", or the table goes blank.
      renderTable(ENTRIES);
      await pickTypes("Brokers Fee");
      expect(typeCells()).toEqual(["Brokers Fee"]);
      await userEvent.type(
        screen.getByRole("combobox", { name: "Filter Type" }),
        "{Backspace}",
      );
      expect(typeCells()).toHaveLength(4);
      expect(
        screen.queryByRole("button", { name: /Clear filters/ }),
      ).not.toBeInTheDocument();
    });
  });

  it("humanizes a ref_type that has no known entry type", () => {
    renderTable([
      {
        ...ENTRY_POSITIVE,
        ref_type: "some_future_fee",
      } as unknown as CharacterWalletJournalEntry,
    ]);
    expect(typeCell("Some Future Fee")).toBeInTheDocument();
  });

  it("renders multiple rows including a negative-amount entry", () => {
    renderTable([ENTRY_POSITIVE, ENTRY_NEGATIVE]);
    // Two distinct balance cells render -> both rows present
    expect(screen.getByText("1,000,000 ISK")).toBeInTheDocument();
    expect(screen.getByText("999,750 ISK")).toBeInTheDocument();
    expect(screen.getByText("Brokers fee")).toBeInTheDocument();
  });

  it("renders skeleton rows instead of entries while loading", () => {
    const { container } = renderTable([ENTRY_POSITIVE], true);
    expect(container.querySelectorAll("tr[data-skeleton]")).toHaveLength(25);
    expect(screen.queryByText("1,000,000 ISK")).not.toBeInTheDocument();
  });

  // The firstParty / secondParty / taxReceiverId columns are hidden by default.
  // Toggling them on from the Columns menu makes their cell renderers execute
  // for every row. Their inner @jitaspace/ui children are no-op-stubbed, so we
  // assert on the now-visible column headers (proof the columns mounted and
  // their cells ran) rather than on cell text.
  it("executes the hidden First/Second-Party and Tax-Receiver cells when their columns are toggled on", async () => {
    // ENTRY_POSITIVE carries first/second party + tax_receiver ids so all three
    // cells hit their populated branch.
    const table = renderTable([ENTRY_POSITIVE]).getByRole("table");

    // These columns start hidden -> their headers are absent from the table.
    expect(within(table).queryByText("First Party")).not.toBeInTheDocument();
    expect(within(table).queryByText("Second Party")).not.toBeInTheDocument();
    expect(within(table).queryByText("Tax Receiver")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Columns" }));
    await userEvent.click(screen.getByLabelText("First Party"));
    await userEvent.click(screen.getByLabelText("Second Party"));
    await userEvent.click(screen.getByLabelText("Tax Receiver"));

    expect(within(table).getByText("First Party")).toBeInTheDocument();
    expect(within(table).getByText("Second Party")).toBeInTheDocument();
    expect(within(table).getByText("Tax Receiver")).toBeInTheDocument();
  });
});
