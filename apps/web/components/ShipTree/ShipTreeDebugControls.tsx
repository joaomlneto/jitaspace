"use client";

import {
  Button,
  ColorInput,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
} from "@mantine/core";

import type { ShipTreeViewProps } from "@jitaspace/ship-tree";
import { shipTreeDefaultBackgroundColor } from "@jitaspace/ship-tree";

/** The ship tree's rendering options, as the debug controls edit them. */
export interface ShipTreeDebugOptions {
  goldenCapsule: boolean;
  strictMode: boolean;
  panZoom: boolean;
  wheelZoom: boolean;
  pinchZoom: boolean;
  pan: boolean;
  groupTooltip: boolean;
  shipTooltip: boolean;
  prices: boolean;
  training: boolean;
  backgroundColor: string;
}

/** The library's own defaults, so turning debug mode on changes nothing yet. */
export const DEFAULT_SHIP_TREE_DEBUG_OPTIONS: ShipTreeDebugOptions = {
  goldenCapsule: false,
  strictMode: false,
  panZoom: true,
  wheelZoom: true,
  pinchZoom: true,
  pan: true,
  groupTooltip: true,
  shipTooltip: true,
  prices: true,
  training: true,
  backgroundColor: shipTreeDefaultBackgroundColor,
};

/** Maps the options to `ShipTreeView` props. Prices and training are the caller's. */
export function shipTreeDebugViewProps(
  options: ShipTreeDebugOptions,
): Pick<
  ShipTreeViewProps,
  | "goldenCapsule"
  | "strictMode"
  | "panZoom"
  | "backgroundColor"
  | "groupTooltip"
  | "shipTooltip"
> {
  return {
    goldenCapsule: options.goldenCapsule,
    strictMode: options.strictMode,
    panZoom: options.panZoom && {
      wheelZoom: options.wheelZoom,
      pinchZoom: options.pinchZoom,
      pan: options.pan,
    },
    backgroundColor: options.backgroundColor,
    groupTooltip: options.groupTooltip,
    shipTooltip: options.shipTooltip,
  };
}

const SWITCHES: readonly {
  key: Exclude<keyof ShipTreeDebugOptions, "backgroundColor">;
  label: string;
  description: string;
  /** Only meaningful while this other option is on. */
  dependsOn?: keyof ShipTreeDebugOptions;
}[] = [
  {
    key: "goldenCapsule",
    label: "Golden capsule",
    description: "Draw the capsule in the golden pod's gold",
  },
  {
    key: "strictMode",
    label: "Strict mode",
    description: "Hide the skill bars of locked groups",
  },
  {
    key: "panZoom",
    label: "Pan and zoom",
    description: "Off freezes the tree at its fitted size",
  },
  {
    key: "wheelZoom",
    label: "Wheel zoom",
    description: "Zoom with the mouse wheel or trackpad",
    dependsOn: "panZoom",
  },
  {
    key: "pinchZoom",
    label: "Pinch zoom",
    description: "Zoom with two fingers",
    dependsOn: "panZoom",
  },
  {
    key: "pan",
    label: "Drag to pan",
    description: "Move the tree by dragging",
    dependsOn: "panZoom",
  },
  {
    key: "groupTooltip",
    label: "Group tooltips",
    description: "Skills and bonuses on group nodes",
  },
  {
    key: "shipTooltip",
    label: "Ship tooltips",
    description: "Render, bonuses and price on ship nodes",
  },
  {
    key: "prices",
    label: "Prices",
    description: "ESI's market average in ship tooltips",
  },
  {
    key: "training",
    label: "Skill in training",
    description: "Highlight it in group tooltips",
  },
];

export interface ShipTreeDebugControlsProps {
  value: ShipTreeDebugOptions;
  onChange: (value: ShipTreeDebugOptions) => void;
}

/**
 * The ship tree's rendering options as switches, for Settings → Experimental →
 * Ship Tree debug mode. Shown above the tree only while that is on.
 */
export function ShipTreeDebugControls({
  value,
  onChange,
}: Readonly<ShipTreeDebugControlsProps>) {
  const set = <K extends keyof ShipTreeDebugOptions>(
    key: K,
    option: ShipTreeDebugOptions[K],
  ) => {
    onChange({ ...value, [key]: option });
  };

  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      component="section"
      aria-label="Ship Tree debug options"
    >
      <Stack gap="sm">
        <Group justify="space-between">
          <Text size="sm" fw={600}>
            Ship Tree debug mode
          </Text>
          <Button
            size="compact-xs"
            variant="default"
            onClick={() => {
              onChange(DEFAULT_SHIP_TREE_DEBUG_OPTIONS);
            }}
          >
            Reset
          </Button>
        </Group>
        <Group gap="md" align="flex-start">
          {SWITCHES.map(({ key, label, description, dependsOn }) => (
            <Switch
              key={key}
              size="xs"
              label={label}
              description={description}
              checked={value[key]}
              disabled={dependsOn !== undefined && !value[dependsOn]}
              onChange={(event) => {
                set(key, event.currentTarget.checked);
              }}
            />
          ))}
          <ColorInput
            size="xs"
            label="Background"
            value={value.backgroundColor}
            onChange={(color) => {
              set("backgroundColor", color);
            }}
            w={140}
          />
        </Group>
      </Stack>
    </Paper>
  );
}
