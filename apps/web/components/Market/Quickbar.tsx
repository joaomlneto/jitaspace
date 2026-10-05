"use client";

import type { DragEvent, ReactNode } from "react";
import { createContext, use, useMemo, useState } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Button,
  Group,
  Loader,
  Menu,
  NavLink,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconArrowsMove,
  IconDots,
  IconFolder,
  IconFolderOpen,
  IconFolderPlus,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";

import { TypeAvatar } from "@jitaspace/eve-components";

import type { MarketTreeFilter } from "./filterMarketTree";
import type { MarketTree } from "./readMarketTree";
import type { QuickbarData, QuickbarDragPayload } from "~/lib/quickbar";
import {
  buildQuickbarTree,
  countItems,
  flattenFolders,
  isWithin,
  mayBeQuickbarDrag,
  QUICKBAR_DRAG_TYPE,
  QUICKBAR_ROOT_KEY,
  readQuickbarDrag,
  useQuickbarHydrated,
  useQuickbarStore,
} from "~/lib/quickbar";
import { filterMarketTree } from "./filterMarketTree";
import classes from "./Quickbar.module.css";

/** As in the market groups tree: past this, a search filters but opens nothing. */
const MAX_AUTO_EXPAND_MATCHES = 200;

const NEW_FOLDER_NAME = "New folder";

interface QuickbarContextValue {
  data: QuickbarData;
  quickbar: ReturnType<typeof buildQuickbarTree>;
  filter: MarketTreeFilter | null;
  isOpen: (folderId: string) => boolean;
  toggle: (folderId: string) => void;
  open: (folderId: string) => void;
  editingId: string | null;
  setEditingId: (folderId: string | null) => void;
  newFolder: (parentId: string | null) => void;
}

const QuickbarContext = createContext<QuickbarContextValue | null>(null);

function useQuickbarContext(): QuickbarContextValue {
  const value = use(QuickbarContext);
  if (!value) throw new Error("Quickbar rows render inside <Quickbar>");
  return value;
}

/** Put a dropped item or folder into `folderId` (`null`: the top level). */
function applyDrop(payload: QuickbarDragPayload, folderId: string | null) {
  const store = useQuickbarStore.getState();
  if (payload.kind === "item") store.addItem(payload.typeId, folderId);
  else store.moveFolder(payload.folderId, folderId);
}

/**
 * Drag-over highlighting and dropping for one target. Rows nest inside the
 * top level's area, so a row stops the event from reaching it.
 */
function useDropTarget(folderId: string | null, onDropped?: () => void) {
  const [over, setOver] = useState(false);
  return {
    "data-drop-target": over || undefined,
    onDragOver: (event: DragEvent) => {
      if (!mayBeQuickbarDrag(event.dataTransfer)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      setOver(true);
    },
    onDragLeave: (event: DragEvent) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }
      setOver(false);
    },
    onDrop: (event: DragEvent) => {
      setOver(false);
      const payload = readQuickbarDrag(event.dataTransfer);
      if (!payload) return;
      event.preventDefault();
      event.stopPropagation();
      applyDrop(payload, folderId);
      onDropped?.();
    },
  };
}

function startDrag(event: DragEvent, payload: QuickbarDragPayload) {
  event.stopPropagation();
  event.dataTransfer.effectAllowed = "copyMove";
  event.dataTransfer.setData(QUICKBAR_DRAG_TYPE, JSON.stringify(payload));
  if (payload.kind === "item") {
    const url = new URL(`/market/${payload.typeId}`, window.location.origin);
    event.dataTransfer.setData("text/uri-list", url.href);
    event.dataTransfer.setData("text/plain", url.href);
  }
}

/**
 * Ask where to move an item or folder. A dialog rather than a submenu: the
 * sidebar is narrow, and in the phone drawer a submenu has nowhere to open.
 */
function openMoveDialog(
  subject: string,
  payload: QuickbarDragPayload,
  data: QuickbarData,
) {
  const current =
    payload.kind === "item"
      ? (data.items[payload.typeId] ?? null)
      : (data.folders[payload.folderId]?.parentId ?? null);
  const destinations = [
    { folderId: null as string | null, name: "Top level", depth: 0 },
    ...flattenFolders(data).map(({ folder, depth }) => ({
      folderId: folder.id,
      name: folder.name,
      depth: depth + 1,
    })),
  ].filter(
    ({ folderId }) =>
      payload.kind !== "folder" ||
      folderId === null ||
      !isWithin(data, folderId, payload.folderId),
  );

  const id = modals.open({
    title: `Move “${subject}” to`,
    children: (
      <Stack gap={2}>
        {destinations.map(({ folderId, name, depth }) => (
          <Button
            key={folderId ?? "top-level"}
            variant={folderId === current ? "light" : "subtle"}
            justify="flex-start"
            leftSection={
              folderId === null ? null : <IconFolder size={16} stroke={1.5} />
            }
            pl={`calc(var(--mantine-spacing-xs) + ${depth - 1} * var(--mantine-spacing-md))`}
            disabled={folderId === current}
            onClick={() => {
              applyDrop(payload, folderId);
              modals.close(id);
            }}
          >
            {name}
          </Button>
        ))}
      </Stack>
    ),
  });
}

function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          className={classes.menuButton}
          aria-label={label}
        >
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>{children}</Menu.Dropdown>
    </Menu>
  );
}

function FolderNameInput({
  folderId,
  name,
}: {
  folderId: string;
  name: string;
}) {
  const { setEditingId } = useQuickbarContext();
  const commit = (value: string) => {
    useQuickbarStore.getState().renameFolder(folderId, value);
    setEditingId(null);
  };
  return (
    <TextInput
      size="xs"
      aria-label="Folder name"
      defaultValue={name}
      autoFocus
      onFocus={(event) => event.currentTarget.select()}
      onBlur={(event) => commit(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit(event.currentTarget.value);
        if (event.key === "Escape") setEditingId(null);
      }}
      py={4}
    />
  );
}

function FolderRow({ folderKey }: { folderKey: number }) {
  const context = useQuickbarContext();
  const { data, quickbar, isOpen, toggle, open, editingId } = context;
  const folderId = quickbar.folderIdByKey.get(folderKey);
  const folder = folderId === undefined ? undefined : data.folders[folderId];
  const drop = useDropTarget(folderId ?? null, () => {
    if (folderId !== undefined) open(folderId);
  });
  if (folderId === undefined || !folder) return null;

  const opened = isOpen(folderId);
  const itemCount = countItems(data, folderId);

  const confirmDelete = () => {
    const remove = () => useQuickbarStore.getState().deleteFolder(folderId);
    const subfolders =
      quickbar.tree.marketGroups[folderKey]?.childrenMarketGroupIds.length;
    if (itemCount === 0 && !subfolders) {
      remove();
      return;
    }
    modals.openConfirmModal({
      title: `Delete “${folder.name}”?`,
      children: (
        <Text size="sm">
          {itemCount === 1
            ? "The item in it is removed from your quickbar too."
            : `The ${itemCount.toLocaleString()} items in it are removed from your quickbar too.`}
        </Text>
      ),
      labels: { confirm: "Delete folder", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: remove,
    });
  };

  return (
    <>
      <div
        className={classes.row}
        draggable={editingId !== folderId}
        onDragStart={(event) => startDrag(event, { kind: "folder", folderId })}
        {...drop}
      >
        {editingId === folderId ? (
          <FolderNameInput folderId={folderId} name={folder.name} />
        ) : (
          <NavLink
            component="button"
            label={folder.name}
            leftSection={
              opened ? (
                <IconFolderOpen size={20} stroke={1.5} />
              ) : (
                <IconFolder size={20} stroke={1.5} />
              )
            }
            rightSection={
              <Text size="xs" c="dimmed">
                {itemCount.toLocaleString()}
              </Text>
            }
            aria-expanded={opened}
            onClick={() => toggle(folderId)}
          />
        )}
        <RowMenu label={`${folder.name} options`}>
          <Menu.Item
            leftSection={<IconFolderPlus size={16} />}
            onClick={() => context.newFolder(folderId)}
          >
            New folder inside
          </Menu.Item>
          <Menu.Item
            leftSection={<IconPencil size={16} />}
            onClick={() => context.setEditingId(folderId)}
          >
            Rename
          </Menu.Item>
          <Menu.Item
            leftSection={<IconArrowsMove size={16} />}
            onClick={() =>
              openMoveDialog(folder.name, { kind: "folder", folderId }, data)
            }
          >
            Move to…
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={confirmDelete}
          >
            Delete folder
          </Menu.Item>
        </RowMenu>
      </div>
      {opened && (
        <div className={classes.children}>
          <FolderContents folderKey={folderKey} />
        </div>
      )}
    </>
  );
}

function ItemRow({ typeId, name }: { typeId: number; name: string }) {
  const { data } = useQuickbarContext();
  return (
    <div
      className={classes.row}
      draggable
      onDragStart={(event) => startDrag(event, { kind: "item", typeId })}
    >
      <NavLink
        component={Link}
        href={`/market/${typeId}`}
        label={name}
        leftSection={<TypeAvatar size={24} typeId={typeId} variation="icon" />}
        // The row is the drag handle; the link alone would drag a bare URL.
        draggable={false}
      />
      <RowMenu label={`${name} options`}>
        <Menu.Item
          leftSection={<IconArrowsMove size={16} />}
          onClick={() => openMoveDialog(name, { kind: "item", typeId }, data)}
        >
          Move to…
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={() => useQuickbarStore.getState().removeItem(typeId)}
        >
          Remove from quickbar
        </Menu.Item>
      </RowMenu>
    </div>
  );
}

/** A folder's (or the top level's) subfolders, then its items. */
function FolderContents({ folderKey }: { folderKey: number }) {
  const { quickbar, filter } = useQuickbarContext();
  const group = quickbar.tree.marketGroups[folderKey];
  if (!group) return null;

  const folderKeys = group.childrenMarketGroupIds.filter(
    (key) => !filter || filter.visibleGroupIds.has(key),
  );
  const types = group.types.filter(
    (type) => !filter || filter.visibleTypeIds.has(type.typeId),
  );
  return (
    <>
      {folderKeys.map((key) => (
        <FolderRow folderKey={key} key={key} />
      ))}
      {types.map((type) => (
        <ItemRow typeId={type.typeId} name={type.name} key={type.typeId} />
      ))}
    </>
  );
}

/**
 * The reader's quickbar: their favourite items, in folders they make, name and
 * nest, searched by the sidebar's search box like the market groups are.
 */
export function Quickbar({
  marketTree,
  query,
}: Readonly<{ marketTree: MarketTree; query: string }>) {
  const hydrated = useQuickbarHydrated();
  const folders = useQuickbarStore((state) => state.folders);
  const items = useQuickbarStore((state) => state.items);
  const data = useMemo(() => ({ folders, items }), [folders, items]);

  const typeNames = useMemo(() => {
    const names = new Map<number, string>();
    for (const group of Object.values(marketTree.marketGroups)) {
      for (const type of group.types) names.set(type.typeId, type.name);
    }
    return names;
  }, [marketTree]);
  const quickbar = useMemo(
    () => buildQuickbarTree(data, (typeId) => typeNames.get(typeId)),
    [data, typeNames],
  );
  const filter = useMemo(
    () => filterMarketTree(quickbar.tree, query),
    [quickbar, query],
  );
  const autoExpand =
    filter !== null && filter.matchCount <= MAX_AUTO_EXPAND_MATCHES;

  // Folders the reader opened or closed by hand, over what the search opens.
  // A new search forgets the closings, so it can open any folder it needs to;
  // the openings stay, so clearing the search leaves the tree as it was.
  const [manual, setManual] = useState<ReadonlyMap<string, boolean>>(
    () => new Map(),
  );
  const [manualQuery, setManualQuery] = useState(query);
  if (manualQuery !== query) {
    setManualQuery(query);
    setManual(
      (current) => new Map([...current].filter(([, opened]) => opened)),
    );
  }
  const [editingId, setEditingId] = useState<string | null>(null);
  const rootDrop = useDropTarget(null);

  const isOpen = (folderId: string) => {
    const set = manual.get(folderId);
    if (set !== undefined) return set;
    if (!autoExpand) return false;
    const key = quickbar.keyByFolderId.get(folderId);
    return key !== undefined && filter.expandedGroupIds.has(key);
  };
  const open = (folderId: string) =>
    setManual((current) => new Map(current).set(folderId, true));
  const toggle = (folderId: string) =>
    setManual((current) => new Map(current).set(folderId, !isOpen(folderId)));
  const newFolder = (parentId: string | null) => {
    const id = useQuickbarStore
      .getState()
      .createFolder(NEW_FOLDER_NAME, parentId);
    if (parentId !== null) open(parentId);
    setEditingId(id);
  };

  if (!hydrated) return <Loader size="sm" />;

  const isEmpty =
    Object.keys(folders).length === 0 && Object.keys(items).length === 0;
  const hasMatches = !filter || filter.visibleGroupIds.has(QUICKBAR_ROOT_KEY);

  return (
    <QuickbarContext
      value={{
        data,
        quickbar,
        filter,
        isOpen,
        toggle,
        open,
        editingId,
        setEditingId,
        newFolder,
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" gap="xs">
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<IconFolderPlus size={16} />}
            onClick={() => newFolder(null)}
          >
            New folder
          </Button>
        </Group>
        {isEmpty && (
          <Text size="sm" c="dimmed">
            Your quickbar is empty. Add items with the star on an item&apos;s
            page, by right-clicking one in Market groups, or by dragging one
            onto the Quickbar tab.
          </Text>
        )}
        {!isEmpty && !hasMatches && (
          <Text size="sm" c="dimmed">
            No quickbar folders or items match.
          </Text>
        )}
        {/* The top level: drop here to take something out of its folder. */}
        <div className={classes.root} {...rootDrop}>
          <FolderContents folderKey={QUICKBAR_ROOT_KEY} />
        </div>
      </Stack>
    </QuickbarContext>
  );
}
