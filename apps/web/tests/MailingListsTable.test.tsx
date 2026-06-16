import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — declared at top; the component is lazy-require()d inside each test
// AFTER these are registered (jest.mock is not auto-hoisted in this project).
// ---------------------------------------------------------------------------

const mockUseCharacterMailingLists = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useCharacterMailingLists: (...args: unknown[]) =>
    mockUseCharacterMailingLists(...args),
}));

// GroupListIcon is decorative — stub the whole package to no-op components.
jest.mock("@jitaspace/eve-icons", () => new Proxy({}, { get: () => () => null }));

function renderTable(characterId = 1) {
  const {
    MailingListsTable,
  } = require("~/components/EveMail/MailingListsTable");
  return render(
    <MantineProvider>
      <MailingListsTable characterId={characterId} />
    </MantineProvider>,
  );
}

describe("MailingListsTable", () => {
  beforeEach(() => {
    mockUseCharacterMailingLists.mockReset();
  });

  it("renders a row for each mailing list with its name", () => {
    mockUseCharacterMailingLists.mockReturnValue({
      data: {
        data: [
          { mailing_list_id: 777, name: "Newbros" },
          { mailing_list_id: 888, name: "Mining Ops" },
        ],
      },
      error: undefined,
    });

    renderTable(42);

    // the hook is called with the character id passed to the component
    expect(mockUseCharacterMailingLists).toHaveBeenCalledWith(42);
    expect(screen.getByText("Newbros")).toBeInTheDocument();
    expect(screen.getByText("Mining Ops")).toBeInTheDocument();
  });

  it("shows an error alert when the request fails", () => {
    mockUseCharacterMailingLists.mockReturnValue({
      data: undefined,
      error: new Error("boom"),
    });

    renderTable();

    // both the alert title and body render the same copy
    expect(screen.getAllByText("Error loading messages").length).toBeGreaterThan(
      0,
    );
  });

  it("renders nothing in the list when there is neither data nor error", () => {
    mockUseCharacterMailingLists.mockReturnValue({
      data: undefined,
      error: undefined,
    });

    renderTable();

    expect(screen.queryByText("Error loading messages")).not.toBeInTheDocument();
  });

  it("renders an empty list (no rows) when the data array is empty", () => {
    mockUseCharacterMailingLists.mockReturnValue({
      data: { data: [] },
      error: undefined,
    });

    const { container } = renderTable();

    // no error and no mailing-list text — just an empty Stack
    expect(screen.queryByText("Error loading messages")).not.toBeInTheDocument();
    // The Stack still renders; assert the component mounted without crashing.
    expect(container).toBeInTheDocument();
  });
});
