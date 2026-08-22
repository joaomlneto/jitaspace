import type { CardProps } from "@mantine/core";
import { memo, useMemo } from "react";
import { Card, Skeleton, Stack } from "@mantine/core";

import type { FittingItemFlag } from "@jitaspace/hooks";

import classes from "./ShipFittingCard.module.css";
import { ShipFittingCardHeader } from "./ShipFittingCardHeader";
import { ShipFittingCardModulesSection } from "./ShipFittingCardModulesSection";

export type ShipFittingCardProps = Omit<CardProps, "children"> & {
  name?: string;
  description?: string;
  fittingId?: number;
  items: {
    flag: FittingItemFlag;
    typeId: number;
    //name?: string;
    quantity?: number;
  }[];
  shipTypeId?: number;

  hideHeader?: boolean;
  hideModules?: boolean;
  /**
   * Render placeholder rows in place of the module sections. Without it an
   * empty `items` reads as "this ship has no modules" while they are still
   * being fetched.
   */
  isLoading?: boolean;
};

export const ShipFittingCard = memo(
  ({
    name,
    // destructured to keep them out of `otherProps` (not valid DOM attributes)
    description: _description,
    fittingId: _fittingId,
    items,
    shipTypeId,
    hideHeader = false,
    hideModules = false,
    isLoading = false,
    ...otherProps
  }: ShipFittingCardProps) => {
    const highSlotModules = useMemo(
      () => ({
        name: "High Slots",
        items: items
          .filter(({ flag }) => flag.startsWith("HiSlot"))
          .sort((a, b) => a.flag.localeCompare(b.flag)),
      }),
      [items],
    );

    const midSlotModules = {
      name: "Mid Slots",
      items: items
        .filter(({ flag }) => flag.startsWith("MedSlot"))
        .sort((a, b) => a.flag.localeCompare(b.flag)),
    };

    const lowSlotModules = {
      name: "Low Slots",
      items: items
        .filter(({ flag }) => flag.startsWith("LoSlot"))
        .sort((a, b) => a.flag.localeCompare(b.flag)),
    };

    const rigSlotModules = {
      name: "Rigs",
      items: items
        .filter(({ flag }) => flag.startsWith("RigSlot"))
        .sort((a, b) => a.flag.localeCompare(b.flag)),
    };

    const subsystemSlotModules = {
      name: "Subsystems",
      items: items
        .filter(({ flag }) => flag.startsWith("SubSystemSlot"))
        .sort((a, b) => a.flag.localeCompare(b.flag)),
    };

    const serviceSlotModules = {
      name: "Service Slots",
      items: items
        .filter(({ flag }) => flag.startsWith("ServiceSlot"))
        .sort((a, b) => a.flag.localeCompare(b.flag)),
    };

    const dronesSlotModules = {
      name: "Drone Bay",
      items: items.filter(({ flag }) => flag === "DroneBay"),
    };

    const fightersSlotModules = {
      name: "Fighter Bay",
      items: items.filter(({ flag }) => flag === "FighterBay"),
    };

    const cargoholdSlotModules = {
      name: "Cargohold",
      items: items.filter(({ flag }) => flag === "Cargo"),
    };

    const invalidSlotModules = {
      name: "Invalid",
      items: items.filter(({ flag }) => flag === "Invalid"),
    };

    const moduleSections = [
      highSlotModules,
      midSlotModules,
      lowSlotModules,
      rigSlotModules,
      subsystemSlotModules,
      serviceSlotModules,
      dronesSlotModules,
      fightersSlotModules,
      cargoholdSlotModules,
      invalidSlotModules,
    ];

    return (
      <Card withBorder p={0} m={0} className={classes.card} {...otherProps}>
        {!hideHeader && (
          <ShipFittingCardHeader
            shipName={name}
            shipTypeId={shipTypeId}
            //fitString={toEFTFitString(fit)}
          />
        )}
        {!hideModules &&
          (isLoading ? (
            <Card.Section
              m={0}
              p="xs"
              className={classes.modulesSection}
              data-testid="fitting-modules-skeleton"
            >
              <Stack gap={6}>
                <Skeleton height={10} width="35%" radius="sm" />
                <Skeleton height={16} radius="sm" />
                <Skeleton height={16} radius="sm" />
                <Skeleton height={16} width="70%" radius="sm" />
              </Stack>
            </Card.Section>
          ) : (
            moduleSections
              .filter((section) => section.items.length > 0)
              .map((section) => (
                <ShipFittingCardModulesSection
                  key={section.name}
                  header={section.name}
                  items={section.items}
                />
              ))
          ))}
      </Card>
    );
  },
);
ShipFittingCard.displayName = "ShipFittingCard";
