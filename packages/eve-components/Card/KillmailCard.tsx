"use client";

import type { ReactNode } from "react";
import { memo } from "react";

import type { EntityCardVariant } from "@jitaspace/ui";
import { useKillmail, useSolarSystem } from "@jitaspace/hooks";
import { KillmailCardDisplay } from "@jitaspace/ui";

import { useEntityRefs } from "./useEntityRefs";

export interface KillmailCardProps {
  killmailId: number;
  killmailHash: string;
  variant?: EntityCardVariant;
  headerRightSection?: ReactNode;
}

/** `KillmailCardDisplay`, filled from ESI. */
export const KillmailCard = memo(
  ({
    killmailId,
    killmailHash,
    variant = "full",
    headerRightSection,
  }: KillmailCardProps) => {
    const { data } = useKillmail(killmailHash, killmailId);
    const killmail = data?.data;
    const victim = killmail?.victim;
    const finalBlow = killmail?.attackers.find(
      (attacker) => attacker.final_blow,
    );
    const { data: systemData } = useSolarSystem(killmail?.solar_system_id);
    const ref = useEntityRefs([
      victim?.character_id,
      victim?.corporation_id,
      victim?.alliance_id,
      victim?.ship_type_id,
      finalBlow?.character_id,
      finalBlow?.corporation_id,
      finalBlow?.alliance_id,
      finalBlow?.ship_type_id,
      killmail?.solar_system_id,
    ]);
    const system = ref(killmail?.solar_system_id);

    return (
      <KillmailCardDisplay
        killmailId={killmailId}
        variant={variant}
        headerRightSection={headerRightSection}
        killmail={
          killmail &&
          victim && {
            time: new Date(killmail.killmail_time),
            victim: {
              character: ref(victim.character_id),
              corporation: ref(victim.corporation_id),
              alliance: ref(victim.alliance_id),
              ship: ref(victim.ship_type_id),
              damageTaken: victim.damage_taken,
            },
            finalBlow: finalBlow && {
              character: ref(finalBlow.character_id),
              corporation: ref(finalBlow.corporation_id),
              alliance: ref(finalBlow.alliance_id),
              ship: ref(finalBlow.ship_type_id),
            },
            attackerCount: killmail.attackers.length,
            solarSystem: system && {
              ...system,
              securityStatus: systemData?.data.security_status,
            },
          }
        }
      />
    );
  },
);
KillmailCard.displayName = "KillmailCard";
