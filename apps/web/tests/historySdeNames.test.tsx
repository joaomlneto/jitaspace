import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";

// A type with no English name is stored as the empty string, not null — the SDE
// ingest writes `enString(record.name) ?? ""` into a non-null column. These
// tests pin the rendering end of that: a blank must reach the `#id` placeholder
// rather than being mistaken for a resolved name.

interface MockQuery {
  data?: { name: string | null; parentId: number | null };
  isPending?: boolean;
}
const mockUseQuery = jest.fn<() => MockQuery>();
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => mockUseQuery(),
}));

// `_sde-ui` imports the server action, which reaches for Prisma at module load.
jest.mock("~/lib/db", () => ({ prisma: { type: { findUnique: jest.fn() } } }));

const { TypeName, FactionName } =
  require("~/app/history/_sde-ui") as typeof import("~/app/history/_sde-ui");

const show = (props: { typeId?: number; name?: string }) =>
  render(
    <MantineProvider>
      <TypeName {...props} />
    </MantineProvider>,
  );

beforeEach(() => {
  mockUseQuery.mockReset();
  cleanup();
});

describe("TypeName", () => {
  it("renders a resolved name", () => {
    mockUseQuery.mockReturnValue({
      data: { name: "Rifter", parentId: 25 },
      isPending: false,
    });
    show({ typeId: 587 });
    expect(screen.getByText("Rifter")).toBeTruthy();
  });

  it("falls back to #id when the resolved name is blank", () => {
    mockUseQuery.mockReturnValue({
      data: { name: "", parentId: 25 },
      isPending: false,
    });
    show({ typeId: 587 });
    expect(screen.getByText("#587")).toBeTruthy();
  });

  it("falls back to #id when the resolved name is only whitespace", () => {
    mockUseQuery.mockReturnValue({
      data: { name: "   ", parentId: 25 },
      isPending: false,
    });
    show({ typeId: 587 });
    expect(screen.getByText("#587")).toBeTruthy();
  });

  it("prefers the resolved name over a blank one passed in", () => {
    mockUseQuery.mockReturnValue({
      data: { name: "Rifter", parentId: 25 },
      isPending: false,
    });
    show({ typeId: 587, name: "" });
    expect(screen.getByText("Rifter")).toBeTruthy();
  });

  it("shows the pending placeholder before the name arrives", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: true });
    show({ typeId: 587 });
    expect(screen.getByText("…")).toBeTruthy();
  });
});

describe("FactionName", () => {
  const showFaction = (props: { factionId?: number; name?: string }) =>
    render(
      <MantineProvider>
        <FactionName {...props} />
      </MantineProvider>,
    );

  it("renders a resolved name", () => {
    mockUseQuery.mockReturnValue({
      data: { name: "Caldari State", parentId: null },
      isPending: false,
    });
    showFaction({ factionId: 500001 });
    expect(screen.getByText("Caldari State")).toBeTruthy();
  });

  it("falls back to #id when the resolved name is blank", () => {
    mockUseQuery.mockReturnValue({
      data: { name: "", parentId: null },
      isPending: false,
    });
    showFaction({ factionId: 500001 });
    expect(screen.getByText("#500001")).toBeTruthy();
  });

  it("falls back to #id when the resolved name is only whitespace", () => {
    mockUseQuery.mockReturnValue({
      data: { name: "   ", parentId: null },
      isPending: false,
    });
    showFaction({ factionId: 500001 });
    expect(screen.getByText("#500001")).toBeTruthy();
  });

  it("renders a supplied name without waiting on the query", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: true });
    showFaction({ factionId: 500001, name: "Caldari State" });
    expect(screen.getByText("Caldari State")).toBeTruthy();
  });

  it("prefers the resolved name over a blank one passed in", () => {
    mockUseQuery.mockReturnValue({
      data: { name: "Caldari State", parentId: null },
      isPending: false,
    });
    showFaction({ factionId: 500001, name: "" });
    expect(screen.getByText("Caldari State")).toBeTruthy();
  });

  it("shows the pending placeholder before the name arrives", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: true });
    showFaction({ factionId: 500001 });
    expect(screen.getByText("…")).toBeTruthy();
  });

  it("renders #? when it has neither a name nor an id", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: true });
    showFaction({});
    expect(screen.getByText("#?")).toBeTruthy();
  });
});
