"use client";

import type { CardProps } from "@mantine/core";
import { memo, useMemo } from "react";

import type { FittingItemFlag } from "@jitaspace/hooks";
import { useTypesDogma } from "@jitaspace/hooks";

import { ShipFittingCard } from "./ShipFittingCard";

// ─── DNA parser ─────────────────────────────────────────────────────────────
//
// EVE Online DNA format:
//   SHIP_ID:ITEM;QTY:ITEM;QTY:...::
//
// All items (modules, rigs, charges, drones) are listed together without
// section separators. The slot type (hi/med/lo/rig/cargo) is determined by
// the item's dogma effects, not position in the string. The '::' at the end
// is merely a terminator.
//
// Notes:
//  - The optional '_' suffix on an item ID marks the module as offline.
//  - For modules, QTY means that many copies fitted in consecutive slots.
//  - For charges/drones (no slot effect), QTY is the stack size.

// EVE dogma effect IDs that identify a module's slot type
const SLOT_EFFECT_TO_PREFIX: Record<number, string> = {
  12: "HiSlot", // hiPower
  13: "MedSlot", // medPower
  11: "LoSlot", // loPower
  2663: "RigSlot", // rigSlot
  3772: "SubSystemSlot", // subSystem
  6306: "ServiceSlot", // serviceSlot
};

interface RawDnaItem {
  typeId: number;
  quantity: number;
}

// Determine a module's slot prefix from its dogma effects (if they are
// loaded). Returns undefined for charges/drones/unknown items.
function getSlotPrefix(
  dogma: { dogmaEffects?: { effectID: number }[] } | undefined,
): string | undefined {
  if (!dogma?.dogmaEffects) return undefined;
  for (const { effectID } of dogma.dogmaEffects) {
    if (SLOT_EFFECT_TO_PREFIX[effectID]) {
      return SLOT_EFFECT_TO_PREFIX[effectID];
    }
  }
  return undefined;
}

interface ParsedDnaFlat {
  shipTypeId: number;
  rawItems: RawDnaItem[];
}

function parseDnaFlat(dna: string): ParsedDnaFlat {
  const tokens = dna.split(":");
  let i = 0;
  const rawItems: RawDnaItem[] = [];

  const shipTypeId = Number.parseInt(tokens[i++] ?? "0", 10);

  while (i < tokens.length) {
    const token = tokens[i++] ?? "";
    if (token === "") continue; // terminator / skip empty
    if (!token.includes(";")) continue; // malformed

    const semi = token.indexOf(";");
    const idPart = token.slice(0, semi);
    const qtyPart = token.slice(semi + 1);

    // Strip trailing '_' that marks an offline/unfitted module
    const typeId = Number.parseInt(
      idPart.endsWith("_") ? idPart.slice(0, -1) : idPart,
      10,
    );
    const quantity = Number.parseInt(qtyPart, 10) || 1;

    rawItems.push({ typeId, quantity });
  }

  return { shipTypeId, rawItems };
}

// ─── Component ──────────────────────────────────────────────────────────────

export type DnaShipFittingCardProps = Omit<CardProps, "children"> & {
  /** EVE Online DNA fitting string, e.g. "587:2605;4::::" */
  dna: string;
  name?: string;
  hideHeader?: boolean;
  hideModules?: boolean;
};

export const DnaShipFittingCard = memo(
  ({
    dna,
    name,
    hideHeader,
    hideModules,
    ...cardProps
  }: DnaShipFittingCardProps) => {
    const { shipTypeId, rawItems } = useMemo(() => parseDnaFlat(dna), [dna]);

    const typeIds = useMemo(
      () => [...new Set(rawItems.map((item) => item.typeId))],
      [rawItems],
    );
    const { data: typeDogma } = useTypesDogma(typeIds);

    const items = useMemo<
      { typeId: number; quantity: number; flag: FittingItemFlag }[]
    >(() => {
      const slotCounters: Record<string, number> = {};
      const result: {
        typeId: number;
        quantity: number;
        flag: FittingItemFlag;
      }[] = [];

      for (const { typeId, quantity } of rawItems) {
        // Determine slot prefix from dogma effects (if they are loaded)
        const slotPrefix = getSlotPrefix(typeDogma[typeId]);

        if (slotPrefix) {
          // Module: expand quantity into consecutive slots
          const startIdx = slotCounters[slotPrefix] ?? 0;
          for (let q = 0; q < quantity; q++) {
            result.push({
              typeId,
              quantity: 1,
              flag: `${slotPrefix}${startIdx + q}` as FittingItemFlag,
            });
          }
          slotCounters[slotPrefix] = startIdx + quantity;
        } else {
          // Charge / drone / unknown: single cargo entry
          result.push({ typeId, quantity, flag: "Cargo" });
        }
      }

      return result;
    }, [rawItems, typeDogma]);

    return (
      <ShipFittingCard
        name={name}
        shipTypeId={shipTypeId}
        items={items}
        hideHeader={hideHeader}
        hideModules={hideModules}
        {...cardProps}
      />
    );
  },
);
DnaShipFittingCard.displayName = "DnaShipFittingCard";
