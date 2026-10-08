"use client";

import {
  Badge,
  Box,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";

import { TypeAvatar } from "@jitaspace/ui";

import type {
  DamageType,
  NpcEwar,
  NpcLayer,
  NpcStats,
  PerDamageType,
} from "~/lib/npcStats";
import { DAMAGE_TYPES, sumDamage } from "~/lib/npcStats";

export const DAMAGE_LABEL: Record<DamageType, string> = {
  em: "EM",
  thermal: "Thermal",
  kinetic: "Kinetic",
  explosive: "Explosive",
};
/** EVE's damage-type colours; kinetic is a lighter grey than the bar track. */
export const DAMAGE_COLOR: Record<DamageType, string> = {
  em: "var(--mantine-color-blue-6)",
  thermal: "var(--mantine-color-red-6)",
  kinetic: "var(--mantine-color-gray-5)",
  explosive: "var(--mantine-color-orange-6)",
};

const number = (value: number, digits = 1) =>
  value.toLocaleString("en-US", { maximumFractionDigits: digits });

/** A bar filled to `fraction`, its value written across it. */
function Bar({
  fraction,
  color,
  label,
  title,
}: Readonly<{
  fraction: number;
  color: string;
  label: string;
  title: string;
}>) {
  return (
    <Tooltip label={title}>
      <Box
        pos="relative"
        h={20}
        style={{
          borderRadius: 4,
          overflow: "hidden",
          background: "var(--mantine-color-default-border)",
        }}
      >
        <Box
          h="100%"
          w={`${Math.min(100, Math.max(0, fraction * 100))}%`}
          bg={color}
          style={{ opacity: 0.85 }}
        />
        <Text
          pos="absolute"
          inset={0}
          size="xs"
          fw={600}
          ta="center"
          lh="20px"
          c="bright"
          style={{ textShadow: "0 0 3px var(--mantine-color-body)" }}
        >
          {label}
        </Text>
      </Box>
    </Tooltip>
  );
}

const ROW_COLUMNS = "90px 140px repeat(4, minmax(0, 1fr))";

function DamageRow({
  label,
  damage,
  unit,
}: Readonly<{ label: string; damage: PerDamageType; unit: string }>) {
  const total = sumDamage(damage);
  return (
    <Box style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, gap: 6 }}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600}>
        {number(total)}
      </Text>
      {DAMAGE_TYPES.map((type) => (
        <Bar
          key={type}
          fraction={total > 0 ? damage[type] / total : 0}
          color={DAMAGE_COLOR[type]}
          label={number(damage[type])}
          title={`${DAMAGE_LABEL[type]}: ${number(damage[type])} ${unit}`}
        />
      ))}
    </Box>
  );
}

function LayerRow({
  label,
  layer,
}: Readonly<{ label: string; layer: NpcLayer }>) {
  return (
    <Box style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, gap: 6 }}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Group gap={4} wrap="nowrap">
        <Tooltip label="Hit points">
          <Badge variant="light" color="cyan" size="sm">
            {number(layer.hp, 0)}
          </Badge>
        </Tooltip>
        <Tooltip label="Effective hit points against an even damage spread">
          <Badge variant="light" color="yellow" size="sm">
            {number(layer.ehp, 0)}
          </Badge>
        </Tooltip>
      </Group>
      {DAMAGE_TYPES.map((type) => (
        <Bar
          key={type}
          fraction={layer.resists[type]}
          color={DAMAGE_COLOR[type]}
          label={`${number(layer.resists[type] * 100)}%`}
          title={`${DAMAGE_LABEL[type]} resistance`}
        />
      ))}
    </Box>
  );
}

function Stat({
  label,
  value,
  unit,
  digits = 1,
}: Readonly<{
  label: string;
  value: number | undefined;
  unit: string;
  digits?: number;
}>) {
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600}>
        {value === undefined ? "—" : `${number(value, digits)} ${unit}`}
      </Text>
    </Group>
  );
}

/** Each ability (electronic warfare, repair, mining) as a module icon, its figures on hover. */
export function NpcEwarIcons({ ewar }: Readonly<{ ewar: NpcEwar[] }>) {
  return (
    <>
      {ewar.map((effect) => (
        <Tooltip
          key={effect.label}
          multiline
          label={
            <Stack gap={0}>
              <Text size="sm" fw={600}>
                {effect.label}
              </Text>
              {effect.values.map((v) => (
                <Text key={v.label} size="xs">
                  {v.label}: {number(v.value)} {v.unit}
                </Text>
              ))}
            </Stack>
          }
        >
          <span aria-label={effect.label}>
            <TypeAvatar typeId={effect.iconTypeId} size={22} radius="sm" />
          </span>
        </Tooltip>
      ))}
    </>
  );
}

/** Each ability (electronic warfare, repair, mining) with all its figures. */
export function NpcEwarTable({ ewar }: Readonly<{ ewar: NpcEwar[] }>) {
  return (
    <Table verticalSpacing={6} withRowBorders>
      <Table.Tbody>
        {ewar.map((effect) => (
          <Table.Tr key={effect.label}>
            <Table.Td w={1}>
              <TypeAvatar typeId={effect.iconTypeId} size={28} radius="sm" />
            </Table.Td>
            <Table.Td>
              <Text size="sm" fw={600}>
                {effect.label}
              </Text>
            </Table.Td>
            <Table.Td>
              <Group gap="lg">
                {effect.values.map((v) => (
                  <Text key={v.label} size="sm">
                    <Text span c="dimmed" inherit>
                      {v.label}
                    </Text>{" "}
                    {number(v.value)} {v.unit}
                  </Text>
                ))}
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

/** The colour key for the damage-type bars. */
export function DamageTypeLegend({
  withHpNote = true,
}: Readonly<{ withHpNote?: boolean }>) {
  return (
    <Group gap="md">
      <Text size="sm" c="dimmed">
        Damage types:
      </Text>
      {DAMAGE_TYPES.map((type) => (
        <Group key={type} gap={4}>
          <Box
            w={12}
            h={12}
            bg={DAMAGE_COLOR[type]}
            style={{ borderRadius: 2 }}
          />
          <Text size="sm">{DAMAGE_LABEL[type]}</Text>
        </Group>
      ))}
      {withHpNote && (
        <Text size="sm" c="dimmed">
          · HP in cyan, EHP (against an even damage spread) in yellow
        </Text>
      )}
    </Group>
  );
}

/**
 * An NPC's damage by type, hit points and resistances per layer, and how it
 * flies and targets.
 */
export function NpcCombatStats({ stats }: Readonly<{ stats: NpcStats }>) {
  const turret = stats.weapons.find((weapon) => weapon.kind === "turret");
  const hpTotal = stats.shield.hp + stats.armor.hp + stats.structure.hp;
  const ehpTotal = stats.shield.ehp + stats.armor.ehp + stats.structure.ehp;
  return (
    <Stack gap="sm">
      <Box style={{ overflowX: "auto" }}>
        <Stack gap="sm" miw={480}>
          {stats.alpha && stats.dps && (
            <Stack gap={4}>
              <DamageRow label="Alpha" damage={stats.alpha} unit="HP" />
              <DamageRow label="DPS" damage={stats.dps} unit="HP/s" />
            </Stack>
          )}

          <Stack gap={4}>
            <LayerRow label="Shield" layer={stats.shield} />
            <LayerRow label="Armor" layer={stats.armor} />
            <LayerRow label="Structure" layer={stats.structure} />
            <Box
              style={{
                display: "grid",
                gridTemplateColumns: ROW_COLUMNS,
                gap: 6,
              }}
            >
              <Text size="sm" c="dimmed">
                Total
              </Text>
              <Group gap={4} wrap="nowrap">
                <Badge variant="filled" color="cyan" size="sm">
                  {number(hpTotal, 0)}
                </Badge>
                <Badge variant="filled" color="yellow" size="sm">
                  {number(ehpTotal, 0)}
                </Badge>
              </Group>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" verticalSpacing={2}>
        <Stat label="Attack range" value={stats.attackRange} unit="m" />
        <Stat label="Chase speed" value={stats.chaseSpeed} unit="m/s" />
        <Stat label="Orbit range" value={stats.orbitRange} unit="m" />
        <Stat label="Signature radius" value={stats.signatureRadius} unit="m" />
        <Stat label="Orbit speed" value={stats.orbitSpeed} unit="m/s" />
        <Stat label="Scan resolution" value={stats.scanResolution} unit="mm" />
        {turret?.optimalRange !== undefined && (
          <Stat label="Turret optimal" value={turret.optimalRange} unit="m" />
        )}
        {turret?.falloff !== undefined && (
          <Stat label="Turret falloff" value={turret.falloff} unit="m" />
        )}
        {turret?.trackingSpeed !== undefined && (
          <Stat
            label="Turret tracking"
            value={turret.trackingSpeed}
            unit="rad/s"
            digits={4}
          />
        )}
      </SimpleGrid>
    </Stack>
  );
}
