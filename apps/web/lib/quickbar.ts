import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MarketTree } from "~/components/Market/readMarketTree";

/**
 * The market quickbar, as in the game client's market window: the reader's own
 * tree of favourite items, in folders they name and nest. It is kept in this
 * browser's storage, as the game keeps it in the client.
 */

export const QUICKBAR_STORAGE_KEY = "jitaspace.market-quickbar";

export interface QuickbarFolder {
  id: string;
  name: string;
  /** `null` for a folder at the top level. */
  parentId: string | null;
}

export interface QuickbarData {
  folders: Record<string, QuickbarFolder>;
  /** Each item's folder, keyed by type id; `null` is the top level. */
  items: Record<string, string | null>;
}

/** Which tree the market sidebar shows. */
export type MarketSidebarView = "groups" | "quickbar";

export const EMPTY_QUICKBAR: QuickbarData = { folders: {}, items: {} };

// --- pure operations ----------------------------------------------------------
// Each returns the next data, or the same object when nothing changes, so the
// store can hand them straight to `set`.

/** Add a type, or move it if it is already on the quickbar. */
export function addItem(
  data: QuickbarData,
  typeId: number,
  folderId: string | null = null,
): QuickbarData {
  const target = folderId !== null && data.folders[folderId] ? folderId : null;
  if (data.items[typeId] === target) return data;
  return { ...data, items: { ...data.items, [typeId]: target } };
}

export function removeItem(data: QuickbarData, typeId: number): QuickbarData {
  if (!(typeId in data.items)) return data;
  const { [typeId]: _removed, ...items } = data.items;
  return { ...data, items };
}

export function createFolder(
  data: QuickbarData,
  folder: QuickbarFolder,
): QuickbarData {
  const parentId =
    folder.parentId !== null && data.folders[folder.parentId]
      ? folder.parentId
      : null;
  return {
    ...data,
    folders: { ...data.folders, [folder.id]: { ...folder, parentId } },
  };
}

export function renameFolder(
  data: QuickbarData,
  folderId: string,
  name: string,
): QuickbarData {
  const folder = data.folders[folderId];
  const trimmed = name.trim();
  if (!folder || trimmed === "" || folder.name === trimmed) return data;
  return {
    ...data,
    folders: { ...data.folders, [folderId]: { ...folder, name: trimmed } },
  };
}

/** Whether `folderId` is `ancestorId` or sits somewhere inside it. */
export function isWithin(
  data: QuickbarData,
  folderId: string | null,
  ancestorId: string,
): boolean {
  const seen = new Set<string>();
  for (
    let id = folderId;
    id !== null;
    id = data.folders[id]?.parentId ?? null
  ) {
    if (id === ancestorId) return true;
    if (seen.has(id)) return false;
    seen.add(id);
  }
  return false;
}

/** Move a folder; refused when the target is the folder or inside it. */
export function moveFolder(
  data: QuickbarData,
  folderId: string,
  parentId: string | null,
): QuickbarData {
  const folder = data.folders[folderId];
  if (!folder || folder.parentId === parentId) return data;
  if (parentId !== null && !data.folders[parentId]) return data;
  if (isWithin(data, parentId, folderId)) return data;
  return {
    ...data,
    folders: { ...data.folders, [folderId]: { ...folder, parentId } },
  };
}

/** The folder and every folder inside it. */
export function folderSubtree(data: QuickbarData, folderId: string): string[] {
  return Object.keys(data.folders).filter((id) => isWithin(data, id, folderId));
}

/** Delete a folder with everything in it, as the game does. */
export function deleteFolder(
  data: QuickbarData,
  folderId: string,
): QuickbarData {
  if (!data.folders[folderId]) return data;
  const doomed = new Set(folderSubtree(data, folderId));
  return {
    folders: Object.fromEntries(
      Object.entries(data.folders).filter(([id]) => !doomed.has(id)),
    ),
    items: Object.fromEntries(
      Object.entries(data.items).filter(
        ([, folder]) => folder === null || !doomed.has(folder),
      ),
    ),
  };
}

/** Every folder in tree order (each name-sorted level, depth first). */
export function flattenFolders(
  data: QuickbarData,
): { folder: QuickbarFolder; depth: number }[] {
  const byParent = new Map<string | null, QuickbarFolder[]>();
  for (const folder of Object.values(data.folders)) {
    const siblings = byParent.get(folder.parentId) ?? [];
    siblings.push(folder);
    byParent.set(folder.parentId, siblings);
  }
  const out: { folder: QuickbarFolder; depth: number }[] = [];
  const visit = (parentId: string | null, depth: number) => {
    const children = [...(byParent.get(parentId) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const folder of children) {
      out.push({ folder, depth });
      visit(folder.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}

/** How many items a folder holds, its subfolders' included. */
export function countItems(data: QuickbarData, folderId: string): number {
  const inside = new Set(folderSubtree(data, folderId));
  return Object.values(data.items).filter(
    (folder) => folder !== null && inside.has(folder),
  ).length;
}

/**
 * Make stored data safe to use, whatever is in storage: drop malformed
 * entries, lift folders whose parent is gone (or that loop back on
 * themselves) to the top level, and items whose folder is gone with them.
 */
export function sanitizeQuickbar(value: unknown): QuickbarData {
  if (typeof value !== "object" || value === null) return EMPTY_QUICKBAR;
  const raw = value as { folders?: unknown; items?: unknown };

  const folders: Record<string, QuickbarFolder> = {};
  if (typeof raw.folders === "object" && raw.folders !== null) {
    for (const [id, folder] of Object.entries(raw.folders)) {
      const candidate = folder as Partial<QuickbarFolder> | null;
      if (typeof candidate?.name !== "string" || candidate.name.trim() === "") {
        continue;
      }
      folders[id] = {
        id,
        name: candidate.name.trim(),
        parentId:
          typeof candidate.parentId === "string" ? candidate.parentId : null,
      };
    }
  }
  for (const folder of Object.values(folders)) {
    if (folder.parentId !== null && !folders[folder.parentId]) {
      folder.parentId = null;
    }
  }
  // Break any cycle by lifting the folder that closes it to the top level.
  for (const folder of Object.values(folders)) {
    const seen = new Set<string>([folder.id]);
    for (let id = folder.parentId; id !== null; ) {
      if (seen.has(id)) {
        folder.parentId = null;
        break;
      }
      seen.add(id);
      id = folders[id]?.parentId ?? null;
    }
  }

  const items: Record<string, string | null> = {};
  if (typeof raw.items === "object" && raw.items !== null) {
    for (const [typeId, folder] of Object.entries(raw.items)) {
      const id = Number(typeId);
      if (!Number.isInteger(id) || id <= 0) continue;
      items[id] = typeof folder === "string" && folders[folder] ? folder : null;
    }
  }
  return { folders, items };
}

// --- as a tree ----------------------------------------------------------------

/** The synthetic group holding the top level of the quickbar. */
export const QUICKBAR_ROOT_KEY = 0;

export interface QuickbarTree {
  /**
   * The quickbar in the market tree's shape, so the sidebar's search
   * (`filterMarketTree`) works on it unchanged. Folders get numeric keys;
   * the top level is the group at {@link QUICKBAR_ROOT_KEY}.
   */
  tree: MarketTree;
  folderIdByKey: Map<number, string>;
  keyByFolderId: Map<string, number>;
}

/**
 * Lay the quickbar out as a tree, folders and items each sorted by name.
 * `typeName` names an item; one the market tree doesn't know (no longer on the
 * market) falls back to its id.
 */
export function buildQuickbarTree(
  data: QuickbarData,
  typeName: (typeId: number) => string | undefined,
): QuickbarTree {
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name);
  const folders = Object.values(data.folders).sort(byName);

  const keyByFolderId = new Map<string, number>();
  const folderIdByKey = new Map<number, string>();
  folders.forEach((folder, index) => {
    keyByFolderId.set(folder.id, index + 1);
    folderIdByKey.set(index + 1, folder.id);
  });
  const keyOf = (folderId: string | null) =>
    folderId === null ? QUICKBAR_ROOT_KEY : (keyByFolderId.get(folderId) ?? 0);

  const marketGroups: MarketTree["marketGroups"] = {
    [QUICKBAR_ROOT_KEY]: {
      name: "",
      parentMarketGroupId: null,
      childrenMarketGroupIds: [],
      types: [],
      iconId: null,
    },
  };
  for (const folder of folders) {
    marketGroups[keyOf(folder.id)] = {
      name: folder.name,
      parentMarketGroupId: keyOf(folder.parentId),
      childrenMarketGroupIds: [],
      types: [],
      iconId: null,
    };
  }
  for (const folder of folders) {
    marketGroups[keyOf(folder.parentId)]?.childrenMarketGroupIds.push(
      keyOf(folder.id),
    );
  }
  for (const [typeId, folderId] of Object.entries(data.items)) {
    const id = Number(typeId);
    marketGroups[keyOf(folderId)]?.types.push({
      typeId: id,
      name: typeName(id) ?? `Type ${id}`,
    });
  }
  for (const group of Object.values(marketGroups)) group.types.sort(byName);

  return {
    tree: { rootMarketGroupIds: [QUICKBAR_ROOT_KEY], marketGroups },
    folderIdByKey,
    keyByFolderId,
  };
}

// --- the store ----------------------------------------------------------------

interface QuickbarState extends QuickbarData {
  view: MarketSidebarView;
  setView: (view: MarketSidebarView) => void;
  addItem: (typeId: number, folderId?: string | null) => void;
  removeItem: (typeId: number) => void;
  /** Returns the new folder's id. */
  createFolder: (name: string, parentId?: string | null) => string;
  renameFolder: (folderId: string, name: string) => void;
  moveFolder: (folderId: string, parentId: string | null) => void;
  deleteFolder: (folderId: string) => void;
}

const newFolderId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const dataOf = (state: QuickbarData): QuickbarData => ({
  folders: state.folders,
  items: state.items,
});

export const useQuickbarStore = create<QuickbarState>()(
  persist(
    (set) => ({
      ...EMPTY_QUICKBAR,
      view: "groups",
      setView: (view) => set({ view }),
      addItem: (typeId, folderId = null) =>
        set((state) => addItem(dataOf(state), typeId, folderId)),
      removeItem: (typeId) => set((state) => removeItem(dataOf(state), typeId)),
      createFolder: (name, parentId = null) => {
        const id = newFolderId();
        set((state) =>
          createFolder(dataOf(state), { id, name: name.trim(), parentId }),
        );
        return id;
      },
      renameFolder: (folderId, name) =>
        set((state) => renameFolder(dataOf(state), folderId, name)),
      moveFolder: (folderId, parentId) =>
        set((state) => moveFolder(dataOf(state), folderId, parentId)),
      deleteFolder: (folderId) =>
        set((state) => deleteFolder(dataOf(state), folderId)),
    }),
    {
      name: QUICKBAR_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Read after hydration (useQuickbarHydrated), so the server render and
      // the first client render agree.
      skipHydration: true,
      partialize: ({ folders, items, view }) => ({ folders, items, view }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<QuickbarState>;
        return {
          ...current,
          ...sanitizeQuickbar(stored),
          view: stored.view === "quickbar" ? "quickbar" : "groups",
        };
      },
    },
  ),
);

/**
 * The store's persist API, or `undefined` where there is no storage: on the
 * server, zustand's persist middleware leaves `persist` off the store entirely.
 */
const persistApi = () =>
  useQuickbarStore.persist as typeof useQuickbarStore.persist | undefined;

const subscribeToHydration = (onChange: () => void) =>
  persistApi()?.onFinishHydration(onChange) ?? (() => undefined);
const isHydrated = () => persistApi()?.hasHydrated() ?? false;
// The server, and the first client render that must match it, never have it.
const isHydratedOnServer = () => false;

/**
 * Load the quickbar from storage once mounted, and keep it in step with other
 * tabs. Returns whether it has loaded, so a view can tell "empty" apart from
 * "not read yet".
 *
 * Read with useSyncExternalStore, which takes the snapshot after subscribing:
 * storage is synchronous, so another component's effect can finish hydrating
 * between this one's render and its effect, and a flag set from a listener
 * alone would miss it.
 */
export function useQuickbarHydrated(): boolean {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    isHydrated,
    isHydratedOnServer,
  );

  useEffect(() => {
    const api = persistApi();
    if (!api) return;
    if (!api.hasHydrated()) void api.rehydrate();
    // Another tab saved: read its version.
    const onStorage = (event: StorageEvent) => {
      if (event.key === QUICKBAR_STORAGE_KEY) void api.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return hydrated;
}

/** The type id a drag carries: a quickbar row, or any link to a market page. */
export const QUICKBAR_DRAG_TYPE = "application/x-jitaspace-quickbar";

export type QuickbarDragPayload =
  | { kind: "item"; typeId: number }
  | { kind: "folder"; folderId: string };

export function readQuickbarDrag(
  dataTransfer: DataTransfer,
): QuickbarDragPayload | null {
  const own = dataTransfer.getData(QUICKBAR_DRAG_TYPE);
  if (own) {
    try {
      const payload = JSON.parse(own) as QuickbarDragPayload;
      if (payload.kind === "item" && Number.isInteger(payload.typeId)) {
        return payload;
      }
      if (payload.kind === "folder" && typeof payload.folderId === "string") {
        return payload;
      }
    } catch {
      // Not ours after all; fall through to a dragged link.
    }
  }
  // A link dragged from the market groups tree, an item page, or elsewhere.
  const url =
    dataTransfer.getData("text/uri-list") || dataTransfer.getData("text/plain");
  const match = /\/market\/(\d+)(?:[/?#]|$)/.exec(url.trim());
  const typeId = match?.[1] ? Number(match[1]) : NaN;
  return Number.isInteger(typeId) && typeId > 0
    ? { kind: "item", typeId }
    : null;
}

/** Whether a drag may be something the quickbar accepts, before the drop. */
export function mayBeQuickbarDrag(dataTransfer: DataTransfer): boolean {
  const types = [...dataTransfer.types];
  return (
    types.includes(QUICKBAR_DRAG_TYPE) ||
    types.includes("text/uri-list") ||
    types.includes("text/plain")
  );
}
