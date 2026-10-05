import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";

import type { NamedTypeListMatch } from "~/lib/typeLists";
import {
  TypeListMatchBadges,
  TypeListMatchTable,
  TypeListRuleSummary,
} from "~/components/TypeLists";
// The real anchor, not the @jitaspace/ui stub: it is part of this feature.
import { TypeListAnchor } from "../../../packages/ui/Anchor/TypeListAnchor";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const match = (
  overrides: Partial<NamedTypeListMatch> & { typeListId: number },
): NamedTypeListMatch => ({
  name: `list_${overrides.typeListId}`,
  displayName: null,
  includedBy: ["group"],
  excludedBy: [],
  ...overrides,
});

describe("TypeListRuleSummary", () => {
  it("joins the non-zero counts, singular or plural", () => {
    renderWithMantine(
      <TypeListRuleSummary counts={{ category: 1, group: 0, type: 6 }} />,
    );
    expect(screen.getByText("1 category · 6 types")).toBeInTheDocument();
  });

  it("pluralises categories and keeps a single group singular", () => {
    renderWithMantine(
      <TypeListRuleSummary counts={{ category: 2, group: 1, type: 0 }} />,
    );
    expect(screen.getByText("2 categories · 1 group")).toBeInTheDocument();
  });

  it("shows a dash when the list has no rules", () => {
    renderWithMantine(
      <TypeListRuleSummary counts={{ category: 0, group: 0, type: 0 }} />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("TypeListMatchBadges", () => {
  it("renders one labelled badge per rule kind, in order", () => {
    renderWithMantine(
      <TypeListMatchBadges refTypes={["category", "group", "type"]} />,
    );
    expect(
      screen
        .getAllByText(/^(Category|Group|Type)$/)
        .map((el) => el.textContent),
    ).toEqual(["Category", "Group", "Type"]);
  });

  it("renders nothing for no rule kinds", () => {
    const { container } = renderWithMantine(
      <TypeListMatchBadges refTypes={[]} color="red" />,
    );
    expect(container.querySelectorAll(".mantine-Badge-root")).toHaveLength(0);
  });
});

describe("TypeListMatchTable", () => {
  it("links each list, showing the internal name under a display name", () => {
    renderWithMantine(
      <TypeListMatchTable
        typeLists={[
          match({ typeListId: 7, displayName: "Frigates" }),
          match({ typeListId: 8, name: "unnamed_list" }),
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Frigates" })).toHaveAttribute(
      "href",
      "/type-list/7",
    );
    expect(screen.getByText("list_7")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "unnamed_list" })).toHaveAttribute(
      "href",
      "/type-list/8",
    );
  });

  it("adds an Excluded By column only when some list excludes the item", () => {
    const { unmount } = renderWithMantine(
      <TypeListMatchTable typeLists={[match({ typeListId: 1 })]} />,
    );
    expect(screen.getByText("Included By")).toBeInTheDocument();
    expect(screen.queryByText("Excluded By")).not.toBeInTheDocument();
    unmount();

    renderWithMantine(
      <TypeListMatchTable
        typeLists={[
          match({ typeListId: 1 }),
          match({ typeListId: 2, excludedBy: ["type"] }),
        ]}
      />,
    );
    expect(screen.getByText("Excluded By")).toBeInTheDocument();
  });

  it("sorts by list name", () => {
    renderWithMantine(
      <TypeListMatchTable
        typeLists={[
          match({ typeListId: 1, displayName: "Zealots" }),
          match({ typeListId: 2, displayName: "Atrons" }),
        ]}
      />,
    );
    const links = screen.getAllByRole("link").map((link) => link.textContent);
    expect(links).toEqual(["Atrons", "Zealots"]);
  });

  it("paginates and offers a search once there are more than ten lists", () => {
    renderWithMantine(
      <TypeListMatchTable
        typeLists={Array.from({ length: 12 }, (_, i) =>
          match({ typeListId: i + 1, displayName: `List ${100 + i}` }),
        )}
      />,
    );
    const body = screen.getAllByRole("rowgroup")[1];
    expect(body).toBeDefined();
    expect(within(body!).getAllByRole("link")).toHaveLength(10);
    expect(
      screen.getByRole("combobox", { name: "Rows per page" }),
    ).toBeInTheDocument();
  });
});

describe("TypeListAnchor", () => {
  it("links to the list's page", () => {
    renderWithMantine(<TypeListAnchor typeListId={42}>Drones</TypeListAnchor>);
    expect(screen.getByRole("link", { name: "Drones" })).toHaveAttribute(
      "href",
      "/type-list/42",
    );
  });

  it("renders plain children without an id", () => {
    renderWithMantine(<TypeListAnchor>Drones</TypeListAnchor>);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Drones")).toBeInTheDocument();
  });
});
