import { describe, expect, it } from "@jest/globals";

import type { QuickbarData } from "~/lib/quickbar";
import type * as QuickbarLib from "~/lib/quickbar";
import { filterMarketTree } from "~/components/Market/filterMarketTree";
import {
  addItem,
  buildQuickbarTree,
  countItems,
  createFolder,
  deleteFolder,
  EMPTY_QUICKBAR,
  flattenFolders,
  moveFolder,
  QUICKBAR_DRAG_TYPE,
  QUICKBAR_ROOT_KEY,
  readQuickbarDrag,
  removeItem,
  renameFolder,
  sanitizeQuickbar,
} from "~/lib/quickbar";

/**
 *   Ores/            (ore)
 *     Minerals/      (min)   Tritanium 34, Pyerite 35
 *   Ships/           (ships) Rifter 587
 *   Mexallon 36 at the top level
 */
const sample: QuickbarData = {
  folders: {
    ore: { id: "ore", name: "Ores", parentId: null },
    min: { id: "min", name: "Minerals", parentId: "ore" },
    ships: { id: "ships", name: "Ships", parentId: null },
  },
  items: { 34: "min", 35: "min", 587: "ships", 36: null },
};

const NAMES: Record<number, string> = {
  34: "Tritanium",
  35: "Pyerite",
  36: "Mexallon",
  587: "Rifter",
};
const typeName = (typeId: number) => NAMES[typeId];

describe("quickbar items", () => {
  it("adds to the top level, or to a folder that exists", () => {
    expect(addItem(EMPTY_QUICKBAR, 34).items).toEqual({ 34: null });
    expect(addItem(sample, 603, "ships").items[603]).toBe("ships");
    expect(addItem(sample, 603, "gone").items[603]).toBeNull();
  });

  it("moves an item that is already there instead of duplicating it", () => {
    const moved = addItem(sample, 34, "ships");
    expect(moved.items[34]).toBe("ships");
    expect(Object.keys(moved.items)).toHaveLength(4);
  });

  it("returns the same data when nothing changes", () => {
    expect(addItem(sample, 34, "min")).toBe(sample);
    expect(removeItem(sample, 999)).toBe(sample);
  });

  it("removes an item", () => {
    expect(removeItem(sample, 34).items).not.toHaveProperty("34");
  });
});

describe("quickbar folders", () => {
  it("creates a folder, at the top level if its parent is gone", () => {
    const created = createFolder(sample, {
      id: "new",
      name: "Ammo",
      parentId: "gone",
    });
    expect(created.folders.new).toEqual({
      id: "new",
      name: "Ammo",
      parentId: null,
    });
  });

  it("renames, ignoring a blank name", () => {
    expect(renameFolder(sample, "ships", "  Hulls ").folders.ships?.name).toBe(
      "Hulls",
    );
    expect(renameFolder(sample, "ships", "   ")).toBe(sample);
  });

  it("moves a folder, but never into itself or below itself", () => {
    expect(moveFolder(sample, "ships", "ore").folders.ships?.parentId).toBe(
      "ore",
    );
    expect(moveFolder(sample, "ore", "ore")).toBe(sample);
    expect(moveFolder(sample, "ore", "min")).toBe(sample);
    expect(moveFolder(sample, "min", null).folders.min?.parentId).toBeNull();
  });

  it("deletes a folder with its subfolders and their items", () => {
    const after = deleteFolder(sample, "ore");
    expect(Object.keys(after.folders)).toEqual(["ships"]);
    expect(after.items).toEqual({ 587: "ships", 36: null });
  });

  it("counts a folder's items, its subfolders' included", () => {
    expect(countItems(sample, "ore")).toBe(2);
    expect(countItems(sample, "ships")).toBe(1);
  });

  it("lists folders in tree order with their depth", () => {
    expect(
      flattenFolders(sample).map(({ folder, depth }) => [folder.name, depth]),
    ).toEqual([
      ["Ores", 0],
      ["Minerals", 1],
      ["Ships", 0],
    ]);
  });
});

describe("sanitizeQuickbar", () => {
  it("keeps good data as it is", () => {
    expect(sanitizeQuickbar(sample)).toEqual(sample);
  });

  it("survives whatever is in storage", () => {
    expect(sanitizeQuickbar(null)).toEqual(EMPTY_QUICKBAR);
    expect(sanitizeQuickbar("nonsense")).toEqual(EMPTY_QUICKBAR);
    expect(sanitizeQuickbar({ folders: 7, items: [] })).toEqual(EMPTY_QUICKBAR);
  });

  it("drops malformed entries and re-homes orphans at the top level", () => {
    const cleaned = sanitizeQuickbar({
      folders: {
        a: { name: "A", parentId: "missing" },
        b: { name: "  " },
        c: { parentId: null },
      },
      items: { 34: "b", 35: "a", "-1": null, abc: null, 36: 12 },
    });
    expect(cleaned.folders).toEqual({
      a: { id: "a", name: "A", parentId: null },
    });
    expect(cleaned.items).toEqual({ 34: null, 35: "a", 36: null });
  });

  it("breaks a folder cycle instead of losing the folders", () => {
    const cleaned = sanitizeQuickbar({
      folders: {
        a: { name: "A", parentId: "b" },
        b: { name: "B", parentId: "a" },
      },
      items: {},
    });
    expect(Object.keys(cleaned.folders)).toEqual(["a", "b"]);
    const tops = Object.values(cleaned.folders).filter(
      (folder) => folder.parentId === null,
    );
    expect(tops).toHaveLength(1);
  });
});

describe("buildQuickbarTree", () => {
  it("lays the quickbar out as a name-sorted tree under one root", () => {
    const { tree, folderIdByKey } = buildQuickbarTree(sample, typeName);
    const root = tree.marketGroups[QUICKBAR_ROOT_KEY];

    expect(tree.rootMarketGroupIds).toEqual([QUICKBAR_ROOT_KEY]);
    expect(
      root?.childrenMarketGroupIds.map((key) => folderIdByKey.get(key)),
    ).toEqual(["ore", "ships"]);
    expect(root?.types).toEqual([{ typeId: 36, name: "Mexallon" }]);

    const minerals = [...folderIdByKey].find(([, id]) => id === "min")?.[0];
    expect(
      minerals === undefined ? [] : tree.marketGroups[minerals]?.types,
    ).toEqual([
      { typeId: 35, name: "Pyerite" },
      { typeId: 34, name: "Tritanium" },
    ]);
  });

  it("names an item the market no longer lists by its id", () => {
    const { tree } = buildQuickbarTree(
      { folders: {}, items: { 99999: null } },
      () => undefined,
    );
    expect(tree.marketGroups[QUICKBAR_ROOT_KEY]?.types).toEqual([
      { typeId: 99999, name: "Type 99999" },
    ]);
  });

  it("is searchable with the market tree's own filter", () => {
    const { tree, keyByFolderId } = buildQuickbarTree(sample, typeName);
    const filter = filterMarketTree(tree, "trit");

    expect(filter?.visibleTypeIds).toEqual(new Set([34]));
    // The folders on the way to the match are opened…
    expect(filter?.expandedGroupIds.has(keyByFolderId.get("ore") ?? -1)).toBe(
      true,
    );
    expect(filter?.expandedGroupIds.has(keyByFolderId.get("min") ?? -1)).toBe(
      true,
    );
    // …and the others are hidden.
    expect(filter?.visibleGroupIds.has(keyByFolderId.get("ships") ?? -1)).toBe(
      false,
    );
  });

  it("shows the whole of a folder whose name matches", () => {
    const { tree, keyByFolderId } = buildQuickbarTree(sample, typeName);
    const filter = filterMarketTree(tree, "ships");

    expect(filter?.visibleGroupIds.has(keyByFolderId.get("ships") ?? -1)).toBe(
      true,
    );
    expect(filter?.visibleTypeIds.has(587)).toBe(true);
  });
});

/** A DataTransfer stand-in: jsdom has none. */
function transfer(data: Record<string, string>): DataTransfer {
  return {
    getData: (type: string) => data[type] ?? "",
    types: Object.keys(data),
  } as unknown as DataTransfer;
}

describe("readQuickbarDrag", () => {
  it("reads a quickbar row's own payload", () => {
    expect(
      readQuickbarDrag(
        transfer({
          [QUICKBAR_DRAG_TYPE]: JSON.stringify({
            kind: "folder",
            folderId: "a",
          }),
        }),
      ),
    ).toEqual({ kind: "folder", folderId: "a" });
  });

  it("takes any link to a market page as an item", () => {
    expect(
      readQuickbarDrag(
        transfer({ "text/uri-list": "https://www.jita.space/market/34" }),
      ),
    ).toEqual({ kind: "item", typeId: 34 });
    expect(
      readQuickbarDrag(
        transfer({ "text/plain": "https://www.jita.space/market/587?tab=buy" }),
      ),
    ).toEqual({ kind: "item", typeId: 587 });
  });

  it("ignores anything else", () => {
    expect(
      readQuickbarDrag(transfer({ "text/plain": "https://example.com/" })),
    ).toBeNull();
    expect(
      readQuickbarDrag(transfer({ "text/uri-list": "/market/0" })),
    ).toBeNull();
    expect(
      readQuickbarDrag(transfer({ [QUICKBAR_DRAG_TYPE]: "{not json" })),
    ).toBeNull();
  });
});

describe("folder ids", () => {
  it("are unique, from the platform's CSPRNG with or without randomUUID", () => {
    const { useQuickbarStore } =
      require("~/lib/quickbar") as typeof QuickbarLib;
    const make = () => useQuickbarStore.getState().createFolder("F");

    const secure = Object.getOwnPropertyDescriptor(
      globalThis,
      "isSecureContext",
    );
    try {
      // Off a secure context (a LAN address over http) randomUUID is missing.
      Object.defineProperty(globalThis, "isSecureContext", {
        value: false,
        configurable: true,
      });
      const plain = [make(), make()];
      expect(plain[0]).toMatch(/^[0-9a-f]{32}$/);
      expect(plain[0]).not.toBe(plain[1]);

      Object.defineProperty(globalThis, "isSecureContext", {
        value: true,
        configurable: true,
      });
      expect(make()).toMatch(/^[0-9a-f-]{36}$/);
    } finally {
      if (secure) Object.defineProperty(globalThis, "isSecureContext", secure);
      else Reflect.deleteProperty(globalThis, "isSecureContext");
    }
  });
});
