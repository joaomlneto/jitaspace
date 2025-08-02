import React, { memo } from "react";
import { type CardProps } from "@mantine/core";

import { useKillmail } from "@jitaspace/hooks";

import { ShipFittingCard } from "./ShipFittingCard";

type EsiKillmailFittingCardProps = Omit<CardProps, "children"> & {
  killmailId: number;
  killmailHash: string;
  hideHeader?: boolean;
  hideModules?: boolean;
  fallback?: React.ReactNode;
  hideFallback?: boolean;
};

/**
 * Table to convert flag numbers to names
 * TODO: Move to the data package
 */
const killmailFlagToEnum: Record<number, string> = {
  5: "Cargo",
  11: "LoSlot0",
  12: "LoSlot1",
  13: "LoSlot2",
  14: "LoSlot3",
  15: "LoSlot4",
  16: "LoSlot5",
  17: "LoSlot6",
  18: "LoSlot7",
  19: "MedSlot0",
  20: "MedSlot1",
  21: "MedSlot2",
  22: "MedSlot3",
  23: "MedSlot4",
  24: "MedSlot5",
  25: "MedSlot6",
  26: "MedSlot7",
  27: "HiSlot0",
  28: "HiSlot1",
  29: "HiSlot2",
  30: "HiSlot3",
  31: "HiSlot4",
  32: "HiSlot5",
  33: "HiSlot6",
  34: "HiSlot7",
  87: "DroneBay",
  92: "RigSlot0",
  93: "RigSlot1",
  94: "RigSlot2",
  125: "SubSystemSlot0",
  126: "SubSystemSlot1",
  127: "SubSystemSlot2",
  128: "SubSystemSlot3",
  158: "FighterBay",
  164: "ServiceSlot0",
  165: "ServiceSlot1",
  166: "ServiceSlot2",
  167: "ServiceSlot3",
  168: "ServiceSlot4",
  169: "ServiceSlot5",
  170: "ServiceSlot6",
  171: "ServiceSlot7",
};

export const EsiKillmailFittingCard = memo(
  ({
    killmailId,
    killmailHash,
    fallback,
    hideFallback = false,
    ...otherProps
  }: EsiKillmailFittingCardProps) => {
    const { data } = useKillmail(killmailHash, killmailId);

    return (
      <ShipFittingCard
        name={name?.name ?? "Killmail Fitting"}
        description="Killmail Fitting"
        shipTypeId={data?.data.victim.ship_type_id}
        items={(data?.data.victim.items ?? []).map((item) => ({
          typeId: item.item_type_id,
          flag: killmailFlagToEnum[item.flag] ?? "Invalid",
          quantity: item.quantity_destroyed ?? 0 + (item.quantity_dropped ?? 0),
        }))}
        {...otherProps}
      />
    );
  },
);
EsiKillmailFittingCard.displayName = "EsiKillmailFittingCard";
