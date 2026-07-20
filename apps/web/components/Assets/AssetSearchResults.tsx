"use client";

import { useMemo } from "react";
import { Badge, Box, Center, Group, Paper, Stack, Text } from "@mantine/core";

import { EveEntityName, TypeAnchor } from "@jitaspace/eve-components";
import { ISKAmount, TypeAvatar } from "@jitaspace/ui";

import type { TypeNameGetter } from "./AssetTreeView";
import type { AssetTree } from "./assetTree";
import classes from "./AssetTreeView.module.css";

const MAX_RESULTS = 250;

interface AssetSearchResultsProps {
  query: string;
  tree: AssetTree;
  getTypeName: TypeNameGetter;
}

/** Flat, value-ranked search across every asset, with a "where is it" hint. */
export function AssetSearchResults({
  query,
  tree,
  getTypeName,
}: AssetSearchResultsProps) {
  const needle = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (needle.length === 0) return [];
    const result: {
      itemId: number;
      typeId: number;
      quantity: number;
      name: string;
      value: number;
      locationId: number;
      parentName?: string;
    }[] = [];
    for (const asset of tree.assetById.values()) {
      const name = getTypeName(asset.type_id);
      if (name === undefined) continue;
      if (!name.toLowerCase().includes(needle)) continue;
      const parent = tree.assetById.get(asset.location_id);
      result.push({
        itemId: asset.item_id,
        typeId: asset.type_id,
        quantity: asset.quantity,
        name,
        value: tree.subtreeValue.get(asset.item_id) ?? 0,
        locationId: tree.rootLocationOf.get(asset.item_id) ?? asset.location_id,
        parentName: parent ? getTypeName(parent.type_id) : undefined,
      });
    }
    result.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    return result;
  }, [needle, tree, getTypeName]);

  if (matches.length === 0) {
    return (
      <Center mih={160}>
        <Text c="dimmed" size="sm">
          No items match “{query}”.
        </Text>
      </Center>
    );
  }

  const shown = matches.slice(0, MAX_RESULTS);

  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        {matches.length > MAX_RESULTS
          ? `Showing ${MAX_RESULTS} of ${matches.length} matches`
          : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`}
      </Text>
      <Paper withBorder radius="md" p={4}>
        {shown.map((match) => (
          <Group
            key={match.itemId}
            gap="xs"
            wrap="nowrap"
            px="xs"
            py={5}
            className={classes.row}
          >
            <TypeAvatar
              typeId={match.typeId}
              variation="icon"
              size="sm"
              radius="sm"
            />
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Group gap={6} wrap="nowrap">
                <TypeAnchor typeId={match.typeId} size="sm" lineClamp={1}>
                  {match.name}
                </TypeAnchor>
                {match.quantity > 1 && (
                  <Text span size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    ×{match.quantity.toLocaleString()}
                  </Text>
                )}
              </Group>
              <Group gap={4} wrap="nowrap" c="dimmed">
                <EveEntityName
                  entityId={match.locationId}
                  size="xs"
                  c="dimmed"
                  lineClamp={1}
                />
                {match.parentName && (
                  <Badge
                    size="xs"
                    variant="transparent"
                    color="gray"
                    style={{ flexShrink: 0 }}
                  >
                    in {match.parentName}
                  </Badge>
                )}
              </Group>
            </Box>
            {match.value > 0 && (
              <ISKAmount
                amount={match.value}
                size="xs"
                c="dimmed"
                style={{ flexShrink: 0 }}
              />
            )}
          </Group>
        ))}
      </Paper>
    </Stack>
  );
}
