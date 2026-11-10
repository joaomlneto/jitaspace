/**
 * Real EVE ids, so the avatars load real art from CCP's image server. Every
 * one was resolved through ESI (`/universe/ids`, `/universe/systems/30000142`).
 */
export const SAMPLE = {
  character: { id: 196379789, name: "Chribba" },
  corporation: {
    id: 1164409536,
    name: "Otherworld Enterprises",
    ticker: "OTHER",
  },
  npcCorporation: { id: 1000035, name: "Caldari Navy", ticker: "CN" },
  alliance: { id: 1354830081, name: "Goonswarm Federation", ticker: "CONDI" },
  faction: { id: 500001, name: "Caldari State" },
  /** The four empire races, by the faction whose logo represents them. */
  races: [
    { name: "Caldari", factionId: 500001 },
    { name: "Minmatar", factionId: 500002 },
    { name: "Amarr", factionId: 500003 },
    { name: "Gallente", factionId: 500004 },
  ],
  types: {
    rifter: { id: 587, name: "Rifter" },
    rifterBlueprint: { id: 691, name: "Rifter Blueprint" },
    machariel: { id: 17738, name: "Machariel" },
    tritanium: { id: 34, name: "Tritanium" },
    plex: { id: 44992, name: "PLEX" },
    astrahus: { id: 35832, name: "Astrahus" },
    keepstar: { id: 35834, name: "Keepstar" },
  },
  jita: {
    systemId: 30000142,
    /** Jita's star, an F1 V: type "Sun F1 (Yellow-White)". */
    starTypeId: 3796,
    /** Stargate (Caldari System). */
    stargateTypeId: 16,
    /** Jita IV, a temperate planet. */
    planetTypeId: 13,
    /** Jita IV - Moon 4 - Caldari Navy Assembly Plant. */
    stationTypeId: 52678,
  },
  /** A war ESI listed on 2026-10-13 (`/wars/763455`). */
  war: {
    id: 763455,
    aggressor: {
      allianceId: 99012120,
      name: "From Hisec with Love Coalition",
      ticker: "FHLC",
    },
    defender: {
      corporationId: 98580276,
      name: "D and R Moon Mining Collective",
      ticker: "DR-MM",
    },
  },
} as const;

/** Labels as ESI's `/characters/{id}/mail/labels` returns them. */
export const MAIL_LABELS = [
  { label_id: 1, name: "[Inbox]", color: "#ffffff", unread_count: 3 },
  { label_id: 2, name: "[Sent]", color: "#ffffff", unread_count: 0 },
  { label_id: 4, name: "[Corp]", color: "#ffffff", unread_count: 12 },
  { label_id: 8, name: "[Alliance]", color: "#ffffff", unread_count: 1 },
  { label_id: 16, name: "Fleet ops", color: "#fe0000", unread_count: 0 },
  { label_id: 32, name: "Industry", color: "#ff6600", unread_count: 5 },
];
