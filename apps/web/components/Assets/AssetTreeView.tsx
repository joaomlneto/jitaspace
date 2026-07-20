"use client";

import type { KeyboardEvent } from "react";
import { memo, useMemo, useState } from "react";
import { Badge, Box, Divider, Group, Paper, Text, ThemeIcon } from "@mantine/core";
import { IconChevronRight, IconMapPin } from "@tabler/icons-react";

import type { CharacterAsset } from "@jitaspace/hooks";
import { EveEntityName, TypeAnchor } from "@jitaspace/eve-components";
import { ISKAmount, TypeAvatar } from "@jitaspace/ui";

import type { AssetLocationSummary, AssetTree } from "./assetTree";
import { groupBySection, isFlatSectioning } from "./assetTree";
import classes from "./AssetTreeView.module.css";

/** Resolve a type id to a display name (falls back to the raw id). */
export type TypeNameGetter = (typeId: number) => string | undefined;

interface TreeContext {
  tree: AssetTree;
  getTypeName: TypeNameGetter;
}

const onToggleKey =
  (toggle: () => void) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

function ExpandChevron({ open, hidden }: { open: boolean; hidden?: boolean }) {
  if (hidden) return <Box w={16} style={{ flexShrink: 0 }} />;
  return (
    <IconChevronRight
      size={16}
      className={`${classes.chevron} ${open ? classes.chevronOpen : ""}`}
    />
  );
}

/** A single asset row that expands to reveal the ship/container contents. */
const AssetNode = memo(function AssetNode({
  asset,
  tree,
  getTypeName,
}: TreeContext & { asset: CharacterAsset }) {
  const children = tree.childrenByParent.get(asset.item_id);
  const hasChildren = !!children && children.length > 0;
  const [open, setOpen] = useState(false);
  const toggle = () => hasChildren && setOpen((o) => !o);

  const value = tree.subtreeValue.get(asset.item_id) ?? 0;
  const containedStacks = (tree.subtreeStacks.get(asset.item_id) ?? 1) - 1;
  const name = getTypeName(asset.type_id);

  return (
    <>
      <Group
        gap="xs"
        wrap="nowrap"
        px="xs"
        py={5}
        className={`${classes.row} ${hasChildren ? classes.clickable : ""}`}
        role={hasChildren ? "button" : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        aria-expanded={hasChildren ? open : undefined}
        onClick={toggle}
        onKeyDown={hasChildren ? onToggleKey(toggle) : undefined}
      >
        <ExpandChevron open={open} hidden={!hasChildren} />
        <TypeAvatar
          typeId={asset.type_id}
          variation="icon"
          size="sm"
          radius="sm"
        />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6} wrap="nowrap">
            <TypeAnchor
              typeId={asset.type_id}
              size="sm"
              lineClamp={1}
              onClick={(event) => event.stopPropagation()}
            >
              {name ?? `Type ${asset.type_id}`}
            </TypeAnchor>
            {asset.quantity > 1 && (
              <Text span size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                ×{asset.quantity.toLocaleString()}
              </Text>
            )}
            {asset.is_blueprint_copy && (
              <Badge size="xs" variant="light" color="blue" style={{ flexShrink: 0 }}>
                BPC
              </Badge>
            )}
            {hasChildren && (
              <Badge size="xs" variant="default" style={{ flexShrink: 0 }}>
                {containedStacks} inside
              </Badge>
            )}
          </Group>
        </Box>
        {value > 0 && (
          <ISKAmount amount={value} size="xs" c="dimmed" style={{ flexShrink: 0 }} />
        )}
      </Group>
      {hasChildren && open && (
        <Box className={classes.nested}>
          <AssetItemList items={children} tree={tree} getTypeName={getTypeName} />
        </Box>
      )}
    </>
  );
});

/** A list of sibling assets, grouped into ship-fit / hold sections when useful. */
const AssetItemList = memo(function AssetItemList({
  items,
  tree,
  getTypeName,
}: TreeContext & { items: CharacterAsset[] }) {
  const groups = useMemo(
    () => groupBySection(items, (id) => tree.subtreeValue.get(id) ?? 0),
    [items, tree],
  );

  if (isFlatSectioning(groups)) {
    const flatItems = groups[0]?.items ?? items;
    return (
      <>
        {flatItems.map((asset) => (
          <AssetNode
            key={asset.item_id}
            asset={asset}
            tree={tree}
            getTypeName={getTypeName}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <Box key={group.key} mt={4}>
          <Group justify="space-between" px="xs" gap="xs" wrap="nowrap">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              {group.label}
            </Text>
            <Text size="xs" c="dimmed">
              {group.items.length}
            </Text>
          </Group>
          {group.items.map((asset) => (
            <AssetNode
              key={asset.item_id}
              asset={asset}
              tree={tree}
              getTypeName={getTypeName}
            />
          ))}
        </Box>
      ))}
    </>
  );
});

/** A collapsible panel for one location (station / structure / solar system). */
export const AssetLocationPanel = memo(function AssetLocationPanel({
  location,
  tree,
  getTypeName,
  defaultOpen = false,
}: TreeContext & {
  location: AssetLocationSummary;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => setOpen((o) => !o);

  return (
    <Paper withBorder radius="md">
      <Group
        justify="space-between"
        wrap="nowrap"
        px="md"
        py="sm"
        gap="sm"
        className={classes.locationHeader}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={onToggleKey(toggle)}
      >
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <ExpandChevron open={open} />
          <ThemeIcon variant="light" size="lg" radius="md">
            <IconMapPin size={18} />
          </ThemeIcon>
          <Box style={{ minWidth: 0 }}>
            <EveEntityName
              entityId={location.locationId}
              fw={600}
              size="sm"
              lineClamp={1}
            />
            <Text size="xs" c="dimmed">
              {location.stacks.toLocaleString()}{" "}
              {location.stacks === 1 ? "item" : "items"}
            </Text>
          </Box>
        </Group>
        {location.value > 0 && (
          <ISKAmount amount={location.value} fw={600} size="sm" style={{ flexShrink: 0 }} />
        )}
      </Group>
      {open && (
        <>
          <Divider />
          <Box py="xs">
            <AssetItemList
              items={location.directItems}
              tree={tree}
              getTypeName={getTypeName}
            />
          </Box>
        </>
      )}
    </Paper>
  );
});

/** The full browsable location tree. Auto-opens when there is a single location. */
export const CharacterAssetsTree = memo(function CharacterAssetsTree({
  tree,
  getTypeName,
}: TreeContext) {
  const single = tree.locations.length === 1;
  return (
    <>
      {tree.locations.map((location) => (
        <AssetLocationPanel
          key={location.locationId}
          location={location}
          tree={tree}
          getTypeName={getTypeName}
          defaultOpen={single}
        />
      ))}
    </>
  );
});
