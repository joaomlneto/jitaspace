import { prisma } from "~/lib/db";
import { stripEveMarkup } from "~/lib/eveMarkup";
import { cacheSdeRead } from "~/lib/sdeCache";

/**
 * What the SDE says about a campaign. ESI lists campaigns by UUID, state and
 * progress only; their names, issuers and targets are static data
 * (militaryCampaigns.yaml), keyed by the same UUIDs.
 */
export interface MilitaryCampaignSdeInfo {
  /** Plain text. */
  title: string;
  /** EVE rich text: may hold `showinfo:` links (a region, a faction). */
  subtitle: string | null;
  /** The progress ESI counts towards; for these campaigns, objectives completed. */
  targetProgress: number | null;
  issuerFactionId: number | null;
  issuerFactionName: string | null;
}

/** What the SDE says about an objective (militaryCampaignObjectives.yaml). */
export interface MilitaryCampaignObjectiveSdeInfo {
  /** Plain text. */
  title: string;
  /**
   * Plain text, unlike the campaign's: it is shown in a tooltip, where a link
   * could not be clicked. Stripped here, on the server, so the client receives
   * text only.
   */
  subtitle: string | null;
  /**
   * In the unit its contribution method counts: missions for
   * `CompleteAgentMission`, but raw ISK for the value-denominated ones.
   */
  targetProgress: number | null;
  /** e.g. "CompleteAgentMission", "MineOre". */
  contributionMethodName: string | null;
}

export interface MilitaryCampaignsSdeInfo {
  campaigns: Record<string, MilitaryCampaignSdeInfo>;
  objectives: Record<string, MilitaryCampaignObjectiveSdeInfo>;
}

/**
 * Stored as BigInt because the ISK targets pass int4; well inside a double's
 * exact range (the largest is ~10^10), and a BigInt cannot cross to the client.
 */
const toNumber = (value: bigint | null) =>
  value === null ? null : Number(value);

/**
 * Every campaign and objective the SDE knows. Rows marked deleted are kept:
 * ESI goes on listing a campaign after CCP drops it from the SDE, and its name
 * is still its name.
 *
 * Deliberately uncaught: the page catches outside this scope (see CLAUDE.md →
 * "Never catch a database error inside a `"use cache"` scope").
 */
export async function readMilitaryCampaignsSdeInfo(): Promise<MilitaryCampaignsSdeInfo> {
  "use cache";
  cacheSdeRead();

  const [campaigns, objectives] = await Promise.all([
    prisma.militaryCampaign.findMany({
      select: {
        militaryCampaignId: true,
        title: true,
        subtitle: true,
        targetProgress: true,
        issuerFactionId: true,
      },
    }),
    prisma.militaryCampaignObjective.findMany({
      select: {
        militaryCampaignObjectiveId: true,
        title: true,
        subtitle: true,
        targetProgress: true,
        contributionMethodName: true,
      },
    }),
  ]);

  const factionIds = [
    ...new Set(campaigns.flatMap((campaign) => campaign.issuerFactionId ?? [])),
  ];
  const factions =
    factionIds.length === 0
      ? []
      : await prisma.faction.findMany({
          where: { factionId: { in: factionIds } },
          select: { factionId: true, name: true },
        });
  const factionName = new Map(factions.map((f) => [f.factionId, f.name]));

  return {
    campaigns: Object.fromEntries(
      campaigns.map((campaign) => [
        campaign.militaryCampaignId,
        {
          // Titles render in headings and table cells, where markup would show
          // as tags; none carries any today (SDE 3667080), subtitles do.
          title: stripEveMarkup(campaign.title),
          subtitle: campaign.subtitle,
          targetProgress: toNumber(campaign.targetProgress),
          issuerFactionId: campaign.issuerFactionId,
          issuerFactionName:
            campaign.issuerFactionId === null
              ? null
              : (factionName.get(campaign.issuerFactionId) ?? null),
        },
      ]),
    ),
    objectives: Object.fromEntries(
      objectives.map((objective) => [
        objective.militaryCampaignObjectiveId,
        {
          title: stripEveMarkup(objective.title),
          subtitle: objective.subtitle && stripEveMarkup(objective.subtitle),
          targetProgress: toNumber(objective.targetProgress),
          contributionMethodName: objective.contributionMethodName,
        },
      ]),
    ),
  };
}
