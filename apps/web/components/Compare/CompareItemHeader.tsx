"use client";

import { memo } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Menu,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconArrowRight,
  IconDotsVertical,
  IconGripVertical,
  IconPinned,
  IconX,
} from "@tabler/icons-react";

import { TypeAnchor, TypeAvatar, TypeName } from "@jitaspace/eve-components";

import type { IndexedCompareCatalog } from "./catalog";
import { GroupName } from "~/components/Text";
import { SHIP_CATEGORY_ID } from "./catalog";
import { startColumnDrag } from "./columnDrag";

export interface CompareItemHeaderProps {
  typeId: number;
  /** The item's name, for the labels of its buttons. */
  name: string;
  catalog?: IndexedCompareCatalog;
  /** The ESI type's group, for items outside the catalog. */
  fallbackGroupId?: number;
  /** The column's position; 0 is the baseline. */
  index: number;
  /** How many items are compared. */
  count: number;
  /** Move the column to position `index`; omit it when order is fixed. */
  onMove?: (index: number) => void;
  /** Omit it when the items are fixed. */
  onRemove?: () => void;
}

/**
 * The item's group: its catalog name, else looked up from ESI, else a
 * placeholder until the item's group is known.
 */
function GroupLabel({
  name,
  groupId,
}: Readonly<{ name?: string; groupId?: number }>) {
  if (name !== undefined) {
    return (
      <Text fz={10.5} c="dimmed" truncate>
        {name}
      </Text>
    );
  }
  if (groupId === undefined) return <Skeleton height={8} width={50} />;
  return <GroupName fz={10.5} c="dimmed" truncate groupId={groupId} />;
}

/**
 * A compared item's column header: picture, name, group and actions. Every
 * action is reachable three ways: the grip (drag, or ← → when focused), the
 * actions menu (which also serves touch screens, where dragging does not
 * work), and — for removal — the × button. Each button names its item, so a
 * screen reader hears "Remove Rifter" rather than four identical "Remove"s.
 */
export const CompareItemHeader = memo(
  ({
    typeId,
    name,
    catalog,
    fallbackGroupId,
    index,
    count,
    onMove,
    onRemove,
  }: CompareItemHeaderProps) => {
    const type = catalog?.typesById.get(typeId);
    const group = type ? catalog?.groups[type.groupId] : undefined;
    const metaGroupName =
      type?.metaGroupId === undefined
        ? undefined
        : catalog?.metaGroups[type.metaGroupId];
    // A hull reads better as its render than as its inventory icon.
    const isShip = group?.categoryId === SHIP_CATEGORY_ID;
    const groupId = type?.groupId ?? fallbackGroupId;
    const canReorder = onMove !== undefined && count > 1;
    const isBaseline = index === 0;
    const isLast = index === count - 1;

    return (
      <Box pos="relative" px={18}>
        {canReorder && (
          <Tooltip
            label="Drag, or press ← → while focused, to reorder"
            withArrow
            events={{ hover: true, focus: true, touch: false }}
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xs"
              pos="absolute"
              top={0}
              left={-6}
              draggable
              data-compare-grip={typeId}
              onDragStart={(event) => startColumnDrag(event, typeId)}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" && !isBaseline) {
                  onMove(index - 1);
                } else if (event.key === "ArrowRight" && !isLast) {
                  onMove(index + 1);
                } else return;
                event.preventDefault();
              }}
              aria-label={`Reorder ${name}`}
              aria-keyshortcuts="ArrowLeft ArrowRight"
              style={{ cursor: "grab" }}
            >
              <IconGripVertical size={12} />
            </ActionIcon>
          </Tooltip>
        )}
        <Stack gap={0} pos="absolute" top={0} right={-6}>
          {onRemove && (
            <Tooltip label="Remove" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="xs"
                onClick={onRemove}
                aria-label={`Remove ${name}`}
                data-compare-remove={typeId}
              >
                <IconX size={12} />
              </ActionIcon>
            </Tooltip>
          )}
          {canReorder && (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xs"
                  aria-label={`Actions for ${name}`}
                  data-compare-menu={typeId}
                >
                  <IconDotsVertical size={12} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconArrowLeft size={14} />}
                  disabled={isBaseline}
                  onClick={() => onMove(index - 1)}
                >
                  Move left
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconArrowRight size={14} />}
                  disabled={isLast}
                  onClick={() => onMove(index + 1)}
                >
                  Move right
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconPinned size={14} />}
                  disabled={isBaseline}
                  onClick={() => onMove(0)}
                >
                  Set as baseline
                </Menu.Item>
                {onRemove && (
                  <>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconX size={14} />}
                      onClick={onRemove}
                    >
                      Remove
                    </Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </Stack>
        <Group gap={8} wrap="nowrap" justify="center">
          <TypeAvatar
            typeId={typeId}
            variation={isShip ? "render" : undefined}
            size={28}
            radius="sm"
            alt=""
          />
          <Stack gap={1} style={{ minWidth: 0 }}>
            <TypeAnchor
              typeId={typeId}
              fw={650}
              fz={12.5}
              lh={1.25}
              lineClamp={2}
            >
              {type?.name ?? <TypeName span typeId={typeId} />}
            </TypeAnchor>
            <Group gap={4} wrap="nowrap">
              <GroupLabel name={group?.name} groupId={groupId} />
              {metaGroupName && (
                <Badge size="xs" variant="light" color="gray" radius="sm">
                  {metaGroupName}
                </Badge>
              )}
              {isBaseline && count > 1 && (
                <Badge size="xs" variant="outline" radius="sm">
                  Baseline
                </Badge>
              )}
            </Group>
          </Stack>
        </Group>
      </Box>
    );
  },
);
CompareItemHeader.displayName = "CompareItemHeader";
