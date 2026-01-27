import { memo, useMemo } from "react";
import { Card, JsonInput  } from "@mantine/core";
import type {CardProps} from "@mantine/core";

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
};

export const ShipFittingCard = memo(
  ({
    name,
    description,
    fittingId,
    items,
    shipTypeId,
    hideHeader = false,
    hideModules = false,
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
          moduleSections
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <ShipFittingCardModulesSection
                key={section.name}
                header={section.name}
                items={section.items}
              />
            ))}
        {false && (
          <JsonInput
            value={JSON.stringify(
              {
                name,
                description,
                fittingId,
                items,
                shipTypeId,
                hideHeader,
                hideModules,
              },
              null,
              2,
            )}
            readOnly
            autosize
          />
        )}
      </Card>
    );
  },
);
ShipFittingCard.displayName = "ShipFittingCard";
