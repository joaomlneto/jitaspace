import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import type { MarketTree } from "~/components/Market/readMarketTree";
import type { QuickbarData } from "~/lib/quickbar";
import { MarketGroupNavLink } from "~/components/Market/MarketGroupNavLink";
import { MarketGroupsNavigation } from "~/components/Market/MarketGroupsNavigation";
import { describeDeletion, Quickbar } from "~/components/Market/Quickbar";
import {
  QUICKBAR_DRAG_TYPE,
  QUICKBAR_STORAGE_KEY,
  useQuickbarStore,
} from "~/lib/quickbar";

jest.mock("@jitaspace/eve-components", () => ({
  TypeAvatar: () => null,
  // Names an item before the market tree has loaded.
  TypeName: ({ typeId }: { typeId: number }) => <span>{`type ${typeId}`}</span>,
}));
jest.mock("@jitaspace/ui", () => ({ EveIconAvatar: () => null }));

const marketTree: MarketTree = {
  rootMarketGroupIds: [475],
  marketGroups: {
    475: {
      name: "Manufacture & Research",
      parentMarketGroupId: null,
      childrenMarketGroupIds: [1857],
      types: [],
      iconId: null,
    },
    1857: {
      name: "Minerals",
      parentMarketGroupId: 475,
      childrenMarketGroupIds: [],
      types: [
        { typeId: 34, name: "Tritanium" },
        { typeId: 35, name: "Pyerite" },
        { typeId: 36, name: "Mexallon" },
      ],
      iconId: null,
    },
  },
};

/** Ores/ ⊃ Minerals/ ⊃ Tritanium; Mexallon at the top level. */
const sample: QuickbarData = {
  folders: {
    ore: { id: "ore", name: "Ores", parentId: null },
    min: { id: "min", name: "Minerals", parentId: "ore" },
  },
  items: { 34: "min", 36: null },
};

/** Put a quickbar in storage and load it, as a returning reader would. */
async function seed(
  data: QuickbarData,
  view: "groups" | "quickbar" = "groups",
) {
  localStorage.setItem(
    QUICKBAR_STORAGE_KEY,
    JSON.stringify({ state: { ...data, view }, version: 1 }),
  );
  await act(() => useQuickbarStore.persist.rehydrate());
  // Storage restores the tab in view on the first load only; after that, a
  // re-read keeps the current one. Set it as the reader would have left it.
  useQuickbarStore.setState({ view });
}

const stored = () => {
  const { folders, items, view } = useQuickbarStore.getState();
  return { folders, items, view };
};

// env="test" turns Mantine's transitions off, so menus and dialogs open at once.
function wrap(node: ReactNode) {
  // No retries: a failed tree fetch reports at once rather than after backoff.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MantineProvider env="test">
        <ModalsProvider>{node}</ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

async function renderQuickbar(query = "") {
  const view = wrap(<Quickbar marketTree={marketTree} query={query} />);
  await screen.findByRole("button", { name: "New folder" });
  return view;
}

const row = (name: string) => {
  const label = screen.getByText(name, { selector: ".mantine-NavLink-label" });
  const element = label.closest("[draggable]");
  if (!element) throw new Error(`no row for ${name}`);
  return element as HTMLElement;
};

/** The folder row's own toggle (not its options button). */
const folderToggle = (name: string) => {
  const toggle = row(name).querySelector("button.mantine-NavLink-root");
  if (!toggle) throw new Error(`no toggle for ${name}`);
  return toggle;
};

function openMenu(name: string) {
  fireEvent.click(screen.getByRole("button", { name: `${name} options` }));
  return screen.getByRole("menu");
}

/** A drag from one element to another, carrying what the source sets. */
function drag(from: HTMLElement, to: HTMLElement) {
  const data = new Map<string, string>();
  const dataTransfer = {
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? "",
    get types() {
      return [...data.keys()];
    },
    effectAllowed: "all",
    dropEffect: "none",
  };
  fireEvent.dragStart(from, { dataTransfer });
  fireEvent.dragOver(to, { dataTransfer });
  fireEvent.drop(to, { dataTransfer });
}

beforeEach(async () => {
  localStorage.clear();
  await act(() => useQuickbarStore.persist.rehydrate());
  useQuickbarStore.setState({ view: "groups" });
});

describe("Quickbar", () => {
  it("explains how to fill an empty quickbar", async () => {
    await renderQuickbar();
    expect(screen.getByText(/Your quickbar is empty/)).toBeInTheDocument();
  });

  it("lists folders before items, each by name, with a count per folder", async () => {
    await seed(sample);
    await renderQuickbar();

    expect(row("Ores")).toHaveTextContent("1");
    expect(screen.getByText("Mexallon")).toBeInTheDocument();
    // Closed: the folder's contents are not rendered.
    expect(screen.queryByText("Tritanium")).not.toBeInTheDocument();

    fireEvent.click(folderToggle("Ores"));
    fireEvent.click(folderToggle("Minerals"));
    expect(screen.getByRole("link", { name: /Tritanium/ })).toHaveAttribute(
      "href",
      "/market/34",
    );
  });

  it("creates a folder and names it in place", async () => {
    await renderQuickbar();

    fireEvent.click(screen.getByRole("button", { name: "New folder" }));
    const input = screen.getByRole("textbox", { name: "Folder name" });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "Ammo" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(row("Ammo")).toBeInTheDocument();
    expect(Object.values(stored().folders)).toEqual([
      expect.objectContaining({ name: "Ammo", parentId: null }),
    ]);
  });

  it("makes a folder inside another and opens the parent to show it", async () => {
    await seed(sample);
    await renderQuickbar();

    fireEvent.click(
      within(openMenu("Ores")).getByRole("menuitem", {
        name: "New folder inside",
      }),
    );
    const input = screen.getByRole("textbox", { name: "Folder name" });
    fireEvent.change(input, { target: { value: "Ice" } });
    fireEvent.blur(input);

    expect(row("Ice")).toBeInTheDocument();
    const ice = Object.values(stored().folders).find((f) => f.name === "Ice");
    expect(ice?.parentId).toBe("ore");
  });

  it("says what deleting a folder takes with it", () => {
    expect(describeDeletion(1, 0)).toBe(
      "The 1 item in it is removed from your quickbar too.",
    );
    expect(describeDeletion(0, 2)).toBe(
      "The 2 folders in it are removed from your quickbar too.",
    );
    expect(describeDeletion(3, 1)).toBe(
      "The 1 folder and 3 items in it are removed from your quickbar too.",
    );
  });

  it("does not save a rename that Escape cancelled, even if blur follows", async () => {
    await seed(sample);
    await renderQuickbar();

    fireEvent.click(
      within(openMenu("Ores")).getByRole("menuitem", { name: "Rename" }),
    );
    const input = screen.getByRole("textbox", { name: "Folder name" });
    fireEvent.change(input, { target: { value: "Rocks" } });
    // Some browsers fire blur as Escape removes the input: model that by
    // blurring before React has re-rendered it away.
    act(() => {
      fireEvent.keyDown(input, { key: "Escape" });
      fireEvent.blur(input);
    });

    expect(stored().folders.ore?.name).toBe("Ores");
  });

  it("renames a folder, and Escape keeps the old name", async () => {
    await seed(sample);
    await renderQuickbar();

    fireEvent.click(
      within(openMenu("Ores")).getByRole("menuitem", { name: "Rename" }),
    );
    let input = screen.getByRole("textbox", { name: "Folder name" });
    fireEvent.change(input, { target: { value: "Rocks" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(stored().folders.ore?.name).toBe("Ores");

    fireEvent.click(
      within(openMenu("Ores")).getByRole("menuitem", { name: "Rename" }),
    );
    input = screen.getByRole("textbox", { name: "Folder name" });
    fireEvent.change(input, { target: { value: "Rocks" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(stored().folders.ore?.name).toBe("Rocks");
  });

  it("moves an item to a folder from its menu", async () => {
    await seed(sample);
    await renderQuickbar();

    fireEvent.click(
      within(openMenu("Mexallon")).getByRole("menuitem", { name: "Move to…" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("button", { name: "Top level" }),
    ).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Minerals" }));

    expect(stored().items[36]).toBe("min");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("never offers to move a folder into itself", async () => {
    await seed(sample);
    await renderQuickbar();

    fireEvent.click(
      within(openMenu("Ores")).getByRole("menuitem", { name: "Move to…" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).not.toEqual(expect.arrayContaining(["Ores", "Minerals"]));
  });

  it("asks before deleting a folder with items, and deletes them with it", async () => {
    await seed(sample);
    await renderQuickbar();

    fireEvent.click(
      within(openMenu("Ores")).getByRole("menuitem", { name: "Delete folder" }),
    );
    let dialog = screen.getByRole("dialog");
    // Ores holds Minerals, which holds Tritanium: both go.
    expect(dialog).toHaveTextContent(
      "The 1 folder and 1 item in it are removed from your quickbar too.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(stored().folders.ore).toBeDefined();

    fireEvent.click(
      within(openMenu("Ores")).getByRole("menuitem", { name: "Delete folder" }),
    );
    dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete folder" }),
    );
    expect(stored().folders).toEqual({});
    expect(stored().items).toEqual({ 36: null });
  });

  it("deletes an empty folder without asking", async () => {
    await seed({
      folders: { e: { id: "e", name: "Empty", parentId: null } },
      items: {},
    });
    await renderQuickbar();

    fireEvent.click(
      within(openMenu("Empty")).getByRole("menuitem", {
        name: "Delete folder",
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(stored().folders).toEqual({});
  });

  it("removes an item", async () => {
    await seed(sample);
    await renderQuickbar();

    fireEvent.click(
      within(openMenu("Mexallon")).getByRole("menuitem", {
        name: "Remove from quickbar",
      }),
    );
    expect(stored().items).toEqual({ 34: "min" });
  });

  it("searches the quickbar, opening the folders on the way to a match", async () => {
    await seed(sample);
    const { rerender } = await renderQuickbar("trit");

    expect(screen.getByRole("link", { name: /Tritanium/ })).toBeInTheDocument();
    expect(screen.queryByText("Mexallon")).not.toBeInTheDocument();

    // A folder the search opened can still be closed by hand.
    fireEvent.click(folderToggle("Minerals"));
    expect(screen.queryByText("Tritanium")).not.toBeInTheDocument();

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MantineProvider env="test">
          <ModalsProvider>
            <Quickbar marketTree={marketTree} query="zzz" />
          </ModalsProvider>
        </MantineProvider>
      </QueryClientProvider>,
    );
    expect(
      screen.getByText("No quickbar folders or items match."),
    ).toBeInTheDocument();
  });

  it("drags an item into a folder, and a folder into another", async () => {
    await seed({
      folders: {
        ore: { id: "ore", name: "Ores", parentId: null },
        ice: { id: "ice", name: "Ice", parentId: null },
      },
      items: { 36: null },
    });
    await renderQuickbar();

    drag(row("Mexallon"), row("Ores"));
    expect(stored().items[36]).toBe("ore");

    drag(row("Ice"), row("Ores"));
    expect(stored().folders.ice?.parentId).toBe("ore");

    // Ores now holds Ice: dropping Ores into Ice would loop, so nothing moves.
    drag(row("Ores"), row("Ice"));
    expect(stored().folders.ore?.parentId).toBeNull();
  });
});

describe("the market sidebar", () => {
  function mockTree() {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(marketTree),
      }),
    ) as unknown as typeof fetch;
  }

  it("switches between market groups and the quickbar, and remembers which", async () => {
    mockTree();
    wrap(<MarketGroupsNavigation />);

    const quickbarTab = await screen.findByRole("tab", { name: /Quickbar/ });
    expect(
      await screen.findByText("Manufacture & Research"),
    ).toBeInTheDocument();

    fireEvent.click(quickbarTab);
    expect(screen.getByText(/Your quickbar is empty/)).toBeInTheDocument();
    expect(stored().view).toBe("quickbar");
  });

  it("opens on the quickbar for a reader who left it there", async () => {
    mockTree();
    await seed(sample, "quickbar");
    wrap(<MarketGroupsNavigation />);

    expect(await screen.findByText("Mexallon")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Quickbar/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // The tab counts the items.
    expect(screen.getByRole("tab", { name: /Quickbar/ })).toHaveTextContent(
      "2",
    );
  });

  it("keeps the quickbar usable when the market tree fails to load", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      }),
    ) as unknown as typeof fetch;
    await seed(sample, "quickbar");
    wrap(<MarketGroupsNavigation />);

    // Named one by one, without the tree (TypeName, here the shared stub's).
    expect(await screen.findByText("type-36")).toBeInTheDocument();
    expect(row("Ores")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Market groups/ }));
    expect(
      await screen.findByText("Could not load market groups."),
    ).toBeInTheDocument();
  });

  it("adds an item dropped on the Quickbar tab, leaving one already there in place", async () => {
    mockTree();
    await seed(sample);
    wrap(<MarketGroupsNavigation />);
    const tab = await screen.findByRole("tab", { name: /Quickbar/ });

    const dropLink = (url: string) => {
      const dataTransfer = {
        getData: (type: string) => (type === "text/uri-list" ? url : ""),
        types: ["text/uri-list"],
        dropEffect: "none",
      };
      fireEvent.dragOver(tab, { dataTransfer });
      fireEvent.drop(tab, { dataTransfer });
    };
    dropLink("http://localhost/market/35");
    dropLink("http://localhost/market/34");

    expect(stored().items).toEqual({ 34: "min", 35: null, 36: null });
  });
});

describe("the market groups tree", () => {
  it("adds and removes an item with a right-click, starring it while there", () => {
    // No dialogs here, so no ModalsProvider: its idle root hides the tree from
    // the accessibility queries in jsdom.
    render(
      <MantineProvider env="test">
        <MarketGroupNavLink
          marketGroups={marketTree.marketGroups}
          marketGroupId={1857}
        />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByText("Minerals"));
    // Mantine's Collapse leaves the opened group aria-hidden in jsdom (it waits
    // for a transitionend that never fires), so find the link by its text.
    const pyeriteLink = () => {
      const link = screen.getByText("Pyerite").closest("a");
      if (!link) throw new Error("no Pyerite link");
      return link;
    };
    const pyerite = pyeriteLink();
    expect(stored().items).toEqual({});

    fireEvent.contextMenu(pyerite);
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Add to quickbar", hidden: true }),
    );
    expect(stored().items).toEqual({ 35: null });
    expect(
      within(pyeriteLink()).getByLabelText("On your quickbar"),
    ).toBeInTheDocument();

    fireEvent.contextMenu(pyeriteLink());
    fireEvent.click(
      screen.getByRole("menuitem", {
        name: "Remove from quickbar",
        hidden: true,
      }),
    );
    expect(stored().items).toEqual({});
  });
  it("offers the browser menu's link entries it replaces", () => {
    const writeText = jest.fn<(text: string) => Promise<void>>(() =>
      Promise.resolve(),
    );
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <MantineProvider env="test">
        <MarketGroupNavLink
          marketGroups={marketTree.marketGroups}
          marketGroupId={1857}
        />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByText("Minerals"));
    const link = screen.getByText("Pyerite").closest("a");
    if (!link) throw new Error("no Pyerite link");

    fireEvent.contextMenu(link);
    const open = screen.getByRole("menuitem", {
      name: "Open in new tab",
      hidden: true,
    });
    expect(open).toHaveAttribute("href", "/market/35");
    expect(open).toHaveAttribute("target", "_blank");

    fireEvent.click(
      screen.getByRole("menuitem", { name: "Copy link", hidden: true }),
    );
    expect(writeText).toHaveBeenCalledWith("http://localhost/market/35");
  });
});

it("ignores a drag that isn't a quickbar row or a market link", async () => {
  await seed(sample);
  await renderQuickbar();
  const dataTransfer = {
    getData: (type: string) =>
      type === QUICKBAR_DRAG_TYPE ? "" : "https://example.com",
    types: ["text/plain"],
    dropEffect: "none",
  };
  fireEvent.drop(row("Ores"), { dataTransfer });
  expect(stored().items).toEqual(sample.items);
});
