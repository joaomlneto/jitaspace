"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Anchor, Box, Group, Stack, Text, Tooltip } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { TypeAvatar } from "@jitaspace/ui";

import type { IncursionRatGroup } from "./types";
import type { NpcLayer, NpcStats, PerDamageType } from "~/lib/npcStats";
import { DataTable } from "~/components/DataTable";
import {
  DAMAGE_COLOR,
  DAMAGE_LABEL,
  DamageTypeLegend,
  NpcEwarIcons,
} from "~/components/NpcCombatStats";
import { DAMAGE_TYPES, sumDamage } from "~/lib/npcStats";

interface RatRow {
  typeId: number;
  name: string;
  stats: NpcStats;
  /** The group's name without the "Incursion Sansha's Nation" prefix. */
  className: string;
  /** Groups in the order the server lists them, then names. */
  classOrder: string;
  dps: number | null;
  alpha: number | null;
  ehp: number;
}

const number = (value: number, digits = 0) =>
  value.toLocaleString("en-US", { maximumFractionDigits: digits });

const shortGroupName = (name: string) =>
  name.replace(/^Incursion /, "").replace(/^Sansha's Nation /, "") || name;

/** The total, and a thin bar splitting it by damage type. */
function DamageCell({
  damage,
  unit,
}: Readonly<{ damage: PerDamageType | undefined; unit: string }>) {
  if (!damage) {
    return (
      <Text span size="xs" c="dimmed">
        —
      </Text>
    );
  }
  const total = sumDamage(damage);
  return (
    <Tooltip
      label={
        <Stack gap={0}>
          {DAMAGE_TYPES.filter((type) => damage[type] > 0).map((type) => (
            <Text key={type} size="xs">
              {DAMAGE_LABEL[type]}: {number(damage[type], 1)} {unit}
            </Text>
          ))}
        </Stack>
      }
    >
      <Group gap={6} wrap="nowrap" justify="flex-end">
        <Group
          gap={0}
          wrap="nowrap"
          w={40}
          h={6}
          style={{ borderRadius: 2, overflow: "hidden", flexShrink: 0 }}
        >
          {DAMAGE_TYPES.map((type) => (
            <Box
              key={type}
              h="100%"
              w={`${total > 0 ? (damage[type] / total) * 100 : 0}%`}
              bg={DAMAGE_COLOR[type]}
            />
          ))}
        </Group>
        <Text span size="xs" fw={600} miw={40} ta="right">
          {number(total, 1)}
        </Text>
      </Group>
    </Tooltip>
  );
}

/** A layer's four resistances, each in its damage type's colour. */
function ResistCell({
  layer,
  label,
}: Readonly<{ layer: NpcLayer; label: string }>) {
  return (
    <Tooltip
      label={
        <Stack gap={0}>
          <Text size="xs" fw={600}>
            {label}: {number(layer.hp)} HP, {number(layer.ehp)} EHP
          </Text>
          {DAMAGE_TYPES.map((type) => (
            <Text key={type} size="xs">
              {DAMAGE_LABEL[type]}: {number(layer.resists[type] * 100, 1)}%
            </Text>
          ))}
        </Stack>
      }
    >
      <Group gap={6} wrap="nowrap" justify="flex-end">
        {DAMAGE_TYPES.map((type) => (
          <Text
            key={type}
            span
            size="xs"
            fw={600}
            w={18}
            ta="right"
            c={DAMAGE_COLOR[type]}
          >
            {Math.round(layer.resists[type] * 100)}
          </Text>
        ))}
      </Group>
    </Tooltip>
  );
}

/** A measurement with its unit, or a dash. */
const measure = (value: number | undefined, unit: string, scale = 1) =>
  value === undefined
    ? "—"
    : `${number(value / scale, scale === 1 ? 0 : 1)} ${unit}`;

export function RatsTab({ rats }: Readonly<{ rats: IncursionRatGroup[] }>) {
  const rows = useMemo<RatRow[]>(
    () =>
      rats.flatMap((group, groupIndex) =>
        group.rats.map((rat) => ({
          ...rat,
          className: shortGroupName(group.name),
          classOrder: `${String(groupIndex).padStart(3, "0")} ${rat.name}`,
          dps: rat.stats.dps ? sumDamage(rat.stats.dps) : null,
          alpha: rat.stats.alpha ? sumDamage(rat.stats.alpha) : null,
          ehp:
            rat.stats.shield.ehp +
            rat.stats.armor.ehp +
            rat.stats.structure.ehp,
        })),
      ),
    [rats],
  );

  const columns = useMemo<DataTableColumn<RatRow>[]>(
    () => [
      {
        id: "name",
        header: "Rat",
        accessor: "name",
        sortable: true,
        filter: { type: "text" },
        cell: (row) => (
          <Group gap={6} wrap="nowrap">
            <TypeAvatar typeId={row.typeId} size={20} radius="sm" />
            <Anchor
              component={Link}
              href={`/type/${row.typeId}?tab=combat`}
              size="xs"
              fw={600}
              style={{ whiteSpace: "nowrap" }}
            >
              {row.name}
            </Anchor>
            <Group gap={2} wrap="nowrap">
              <NpcEwarIcons ewar={row.stats.ewar} />
            </Group>
          </Group>
        ),
      },
      {
        id: "class",
        header: "Class",
        accessor: "className",
        sortable: true,
        sortAccessor: (row) => row.classOrder,
        filter: { type: "multi-select" },
        cell: (row) => (
          <Text span size="xs" style={{ whiteSpace: "nowrap" }}>
            {row.className}
          </Text>
        ),
      },
      {
        id: "dps",
        header: "DPS",
        accessor: "dps",
        sortable: true,
        align: "right",
        cell: (row) => <DamageCell damage={row.stats.dps} unit="DPS" />,
      },
      {
        id: "alpha",
        header: "Alpha",
        accessor: "alpha",
        sortable: true,
        align: "right",
        cell: (row) => <DamageCell damage={row.stats.alpha} unit="damage" />,
      },
      {
        id: "ehp",
        header: "EHP",
        accessor: "ehp",
        sortable: true,
        align: "right",
        cell: (row) => (
          <Text span size="xs" fw={600}>
            {number(row.ehp)}
          </Text>
        ),
      },
      {
        id: "shield",
        header: "Shield resists",
        sortable: true,
        sortAccessor: (row) => row.stats.shield.ehp,
        align: "right",
        cell: (row) => <ResistCell layer={row.stats.shield} label="Shield" />,
      },
      {
        id: "armor",
        header: "Armor resists",
        sortable: true,
        sortAccessor: (row) => row.stats.armor.ehp,
        align: "right",
        cell: (row) => <ResistCell layer={row.stats.armor} label="Armor" />,
      },
      {
        id: "range",
        header: "Range",
        accessor: (row) => row.stats.attackRange,
        sortable: true,
        align: "right",
        cell: (row) => measure(row.stats.attackRange, "km", 1000),
      },
      {
        id: "orbit",
        header: "Orbit",
        accessor: (row) => row.stats.orbitSpeed,
        sortable: true,
        align: "right",
        cell: (row) => measure(row.stats.orbitSpeed, "m/s"),
      },
      {
        id: "signature",
        header: "Sig.",
        accessor: (row) => row.stats.signatureRadius,
        sortable: true,
        align: "right",
        cell: (row) => measure(row.stats.signatureRadius, "m"),
      },
    ],
    [],
  );

  return (
    <Stack gap="sm">
      <Group justify="space-between" gap="xs">
        <DamageTypeLegend withHpNote={false} />
        <Text size="xs" c="dimmed">
          Resistances in %, shield and armor; hover a cell for the figures.
        </Text>
      </Group>
      <DataTable
        data={rows}
        columns={columns}
        rowId={(row) => row.typeId}
        emptyText="No incursion NPCs found."
        initialSort={{ columnId: "class", direction: "asc" }}
        verticalSpacing={3}
        fontSize="xs"
        highlightOnHover
        striped
      />
    </Stack>
  );
}
