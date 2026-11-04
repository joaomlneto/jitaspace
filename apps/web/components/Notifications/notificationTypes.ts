import type { ComponentType } from "react";
import { createElement } from "react";

import type { EveIconProps } from "@jitaspace/eve-icons";
import {
  AgentIcon,
  AlliancesIcon,
  BountyOfficeIcon,
  ContactsIcon,
  CorporationIcon,
  DecorationsIcon,
  FactionalWarfareIcon,
  IncursionsIcon,
  IndustryIcon,
  InsuranceIcon,
  JumpClonesIcon,
  KillReportIcon,
  KillRightsIcon,
  LockedContainerIcon,
  LPStoreIcon,
  MercenaryAllyIcon,
  MercenaryIcon,
  MoonDrillIcon,
  MutualWarsIcon,
  NoteIcon,
  OpportunitiesTreeIcon,
  PeopleAndPlacesIcon,
  PersonalStandingsIcon,
  RecruitmentIcon,
  RedeemIcon,
  SkillsIcon,
  SovereigntyIcon,
  StationIcon,
  StructureBrowserIcon,
  SurrenderIcon,
  VotesIcon,
  WalletIcon,
  WarsIcon,
} from "@jitaspace/eve-icons";

type EveIcon = ComponentType<EveIconProps>;

/**
 * The icon a notification is drawn with, picked from the `type` string ESI
 * returns. First match wins, so the more specific rules come first: a
 * `CorpWarDeclaredMsg` is a war before it is a corporation notice, and an
 * `AllyJoinedWarAllyMsg` is about an ally before it is about the war.
 */
const ICON_RULES: readonly (readonly [RegExp, EveIcon])[] = [
  [/^KillReport/, KillReportIcon],
  [/^KillRight/, KillRightsIcon],
  [/Bounty/, BountyOfficeIcon],
  [/^Insurance/, InsuranceIcon],
  [/Medal/, DecorationsIcon],
  [/Clone/, JumpClonesIcon],
  [/^Moonmining/, MoonDrillIcon],
  [/^(Sov|Sovereignty|EntosisCapture|IHub|InfrastructureHub)/, SovereigntyIcon],
  [
    /^(Structures?|AllAnchoring|AllStruc|Tower|Orbital|Skyhook|CorpStructLost|OwnershipTransferred)/,
    StructureBrowserIcon,
  ],
  [/Surrender/, SurrenderIcon],
  // Before the war rules: `FWCorpWarningMsg` is no war.
  [/^(FW|FacWar)/, FactionalWarfareIcon],
  [/^Merc/, MercenaryIcon],
  [/Ally/, MercenaryAllyIcon],
  [/MutualWar|WarMutual/, MutualWarsIcon],
  [/War/, WarsIcon],
  [/^(Invasion|Incursion)/, IncursionsIcon],
  [
    /^(CorpApp|CharApp|DustApp|CharLeftCorp|CorpKicked|CorporationLeft)/,
    RecruitmentIcon,
  ],
  [/^(Contact|BuddyConnect)/, ContactsIcon],
  [
    /^(Bill|CorpAllBill|AllMaintenanceBill|CorpDividend|CorpTaxChange|TransactionReversal|Reimbursement|Customs)/,
    WalletIcon,
  ],
  [/^CorpVote/, VotesIcon],
  [/^(CorporationGoal|FreelanceProject)/, OpportunitiesTreeIcon],
  [/^(Agent|Mission|StoryLineMission|ResearchMission)/, AgentIcon],
  [/^NPCStandings/, PersonalStandingsIcon],
  [/^(Station|OfficeLease|CorpOffice)/, StationIcon],
  [/^(Industry|OperationFinished|CombatOperation)/, IndustryIcon],
  [/^LPAutoRedeemed/, LPStoreIcon],
  [/^(SPAutoRedeemed|ExpertSystem)/, SkillsIcon],
  [/^(GameTime|GiftReceived|DailyItemReward|Raffle)/, RedeemIcon],
  [/^LocateChar/, PeopleAndPlacesIcon],
  [/^ContainerPassword/, LockedContainerIcon],
  [/^Corp/, CorporationIcon],
  [/^Alliance/, AlliancesIcon],
];

/** The icon to draw a notification of this type with. */
export function notificationTypeIcon(type: string): EveIcon {
  return ICON_RULES.find(([pattern]) => pattern.test(type))?.[1] ?? NoteIcon;
}

/**
 * A notification type's icon. Picks among module-level icon components, so it
 * never remounts on re-render; `createElement` keeps that choice out of JSX.
 */
export function NotificationTypeIcon({
  type,
  ...props
}: EveIconProps & { type: string }) {
  return createElement(notificationTypeIcon(type), props);
}

/**
 * A readable label made from the type string itself, for the few types the SDE
 * does not name (and before the names have loaded): `CorpAppInvitedMsg` reads
 * "Corp App Invited", `NPCStandingsGained` reads "NPC Standings Gained".
 */
export function humanizeNotificationType(type: string): string {
  return type
    .replace(/Msg\d*$/, "")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

/**
 * The title a notification is listed under: the SDE's display name for its
 * type (notificationTypes.yaml, keyed by the same string ESI returns), else the
 * humanized type.
 */
export function notificationTitle(
  type: string,
  typeNames: Readonly<Record<string, string>> | undefined,
): string {
  return typeNames?.[type] ?? humanizeNotificationType(type);
}
