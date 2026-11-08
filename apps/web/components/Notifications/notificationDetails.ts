import {
  allianceIdRanges,
  characterIdRanges,
  constellationIdRanges,
  corporationIdRanges,
  isIdInRanges,
  regionIdRanges,
  solarSystemRanges,
  stationRanges,
} from "@jitaspace/esi-metadata";

import { stripEveMarkup } from "~/lib/eveMarkup";

/**
 * A notification's `text`, reduced to its top-level `key: value` pairs, keyed
 * by lower-cased key: CCP is inconsistent about casing (`solarSystemID` in sov
 * notices, `solarsystemID` in structure ones).
 */
export type NotificationFields = ReadonlyMap<string, string>;

/**
 * Read the top-level scalar fields of a notification's YAML `text`.
 *
 * Deliberately not a YAML parser: the text carries Python-specific tags
 * (`!!python/tuple`, `!!python/long`) and anchors that a strict parser rejects,
 * and everything the feed uses — ids, the killmail hash — sits at the top level.
 * Nested values (lists of types, show-info tuples) are skipped.
 */
export function parseNotificationFields(
  text: string | undefined,
): NotificationFields {
  const fields = new Map<string, string>();
  for (const line of (text ?? "").split(/\r?\n/)) {
    const match = /^([A-Za-z_]\w*):[ \t]*(.*)$/.exec(line);
    if (!match?.[1]) continue;
    const value = scalarValue(
      (match[2] ?? "")
        // An anchor or tag in front of the value: `&id001 123`, `!!python/long 5`.
        .replace(/^(?:(?:&\w+|!!\S+)\s+)+/, "")
        .trim(),
    );
    if (value) fields.set(match[1].toLowerCase(), value);
  }
  return fields;
}

/**
 * A one-line YAML scalar's value, or undefined for one this reader can't take
 * whole: a block scalar (`subject: |`, `body: >-`) or a quoted string that
 * continues on the next line. Those are long free text, and showing their first
 * line (or the bare indicator) would be wrong.
 */
function scalarValue(raw: string): string | undefined {
  if (raw === "" || /^[|>][-+0-9]*$/.test(raw)) return undefined;
  const quote = raw[0];
  if (quote === "'" || quote === '"') {
    if (raw.length < 2 || !raw.endsWith(quote)) return undefined;
    const inner = raw.slice(1, -1);
    // Single-quoted YAML escapes a quote by doubling it.
    return quote === "'" ? inner.replaceAll("''", "'") : inner;
  }
  return raw;
}

/** The first of `keys` holding a positive integer id. */
export function fieldId(
  fields: NotificationFields,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = fields.get(key.toLowerCase());
    if (value && /^\d+$/.test(value)) {
      const id = Number(value);
      if (id > 0 && Number.isSafeInteger(id)) return id;
    }
  }
  return undefined;
}

/**
 * The page for an id whose kind is only known from its number, as with the
 * parties to a war, which notifications name by bare id.
 */
export function entityHref(id: number | undefined): string | undefined {
  if (id === undefined) return undefined;
  if (isIdInRanges(id, allianceIdRanges)) return `/alliance/${id}`;
  if (isIdInRanges(id, corporationIdRanges)) return `/corporation/${id}`;
  if (isIdInRanges(id, characterIdRanges)) return `/character/${id}`;
  if (isIdInRanges(id, solarSystemRanges)) return `/system/${id}`;
  if (isIdInRanges(id, stationRanges)) return `/station/${id}`;
  if (isIdInRanges(id, constellationIdRanges)) return `/constellation/${id}`;
  if (isIdInRanges(id, regionIdRanges)) return `/region/${id}`;
  return undefined;
}

/**
 * The page for an entity named by category, as ESI's `/universe/names`
 * reports it: how a legacy id that {@link entityHref} cannot place is linked.
 */
export function categoryHref(
  category: string | undefined,
  id: number,
): string | undefined {
  switch (category) {
    case "character":
      return `/character/${id}`;
    case "corporation":
      return `/corporation/${id}`;
    case "alliance":
      return `/alliance/${id}`;
    case "faction":
      return `/faction/${id}`;
    case "solar_system":
      return `/system/${id}`;
    case "station":
      return `/station/${id}`;
    case "constellation":
      return `/constellation/${id}`;
    case "region":
      return `/region/${id}`;
    case "inventory_type":
      return `/type/${id}`;
    default:
      return undefined;
  }
}

export interface NotificationContext {
  type: string;
  senderId: number;
  /** When the notification was sent, as ESI reports it. */
  timestamp: string;
  fields: NotificationFields;
}

/** The sides of a war, and when a notification about it was sent. */
export interface WarQuery {
  aggressorId: number;
  defenderId: number;
  /**
   * The notification does not say which side declared (surrenders name the
   * two sides as `ownerID1`/`ownerID2`), so match the pair either way round.
   */
  eitherWay?: boolean;
  at: string;
}

/** The `/api/wars/find` request that resolves a {@link WarQuery}. */
export function warFindUrl({
  aggressorId,
  defenderId,
  eitherWay,
  at,
}: WarQuery): string {
  const params = new URLSearchParams({
    aggressor: String(aggressorId),
    defender: String(defenderId),
    at,
  });
  if (eitherWay) params.set("either", "1");
  return `/api/wars/find?${params.toString()}`;
}

/**
 * Where a notification leads: a page, or an entity whose kind its id alone
 * does not tell. Corporations and alliances founded before ~2010 share one
 * numbering with characters (Goonswarm Federation is 1354830081), so those are
 * resolved through ESI before they can be linked.
 */
export type NotificationTarget =
  | { href: string }
  | { entityId: number }
  | {
      /**
       * A war, which notifications never name by id: found from its parties
       * (see `/api/wars/find`), else `fallback`.
       */
      war: WarQuery;
      fallback?: NotificationTarget;
    };

/** A target for an entity id: its page if the id says what it is. */
export function entityTarget(
  id: number | undefined,
): NotificationTarget | undefined {
  if (id === undefined) return undefined;
  const href = entityHref(id);
  return href ? { href } : { entityId: id };
}

type TargetRule = (
  context: NotificationContext,
) => NotificationTarget | undefined;

const killmailTarget: TargetRule = ({ fields }) => {
  const id = fieldId(fields, "killMailID");
  if (id === undefined) return undefined;
  const hash = fields.get("killmailhash");
  // ESI needs the hash; the kill page asks zKillboard for it when absent.
  return {
    href:
      hash && /^[0-9a-f]+$/i.test(hash)
        ? `/kill/${id}?hash=${hash}`
        : `/kill/${id}`,
  };
};

/** A place, which ids always identify: no lookup needed. */
const placeTarget = (
  id: number | undefined,
): NotificationTarget | undefined => {
  const href = entityHref(id);
  return href ? { href } : undefined;
};

/**
 * The war between two sides, else the first side's page. With one side alone
 * there is no lookup: that side's latest war could be any of its wars.
 */
function warTarget(
  aggressorId: number | undefined,
  defenderId: number | undefined,
  at: string,
  eitherWay = false,
): NotificationTarget | undefined {
  if (aggressorId === undefined || defenderId === undefined)
    return entityTarget(aggressorId ?? defenderId);
  return {
    war: { aggressorId, defenderId, at, ...(eitherWay && { eitherWay }) },
    fallback: entityTarget(aggressorId),
  };
}

/** Reads the target from the named id fields, first present wins. */
const entityFrom =
  (...keys: string[]): TargetRule =>
  ({ fields }) =>
    entityTarget(fieldId(fields, ...keys));

/**
 * Reads the target from the first of the named id fields that is a place we
 * have a page for. A field can hold an Upwell structure (outside every id
 * range), so the next field, such as the system, gets its turn.
 */
const placeFrom =
  (...keys: string[]): TargetRule =>
  ({ fields }) => {
    for (const key of keys) {
      const target = placeTarget(fieldId(fields, key));
      if (target) return target;
    }
    return undefined;
  };

/**
 * Where clicking a notification goes, first match wins. A type with no rule —
 * or whose text lacks the field its rule reads — is not a link, since sending
 * someone to the wrong page is worse than not sending them anywhere.
 *
 * Field names follow the layouts in antihax/goesi's `notification.go` and the
 * sample notifications in ErikKalkoken/evebuddy's test data.
 */
const TARGET_RULES: readonly (readonly [RegExp, TargetRule])[] = [
  [/^KillReport/, killmailTarget],
  // About a character.
  [
    /^(CorpAppNewMsg|CharAppWithdrawMsg|CharLeftCorpMsg|CharTerminationMsg|KillRight|BountyClaimMsg|BountyESS)/,
    entityFrom("charID"),
  ],
  [/^BountyPlaced/, entityFrom("bountyPlacerID")],
  [/^CloneActivationMsg/, entityFrom("podKillerID")],
  [/^(GameTimeReceived|GiftReceived)$/, entityFrom("senderCharID")],
  [/^GameTimeSent$/, entityFrom("receiverCharID")],
  [/^LocateChar/, entityFrom("characterID")],
  [/^(Contact|BuddyConnect)/, ({ senderId }) => entityTarget(senderId)],
  // Faction warfare names the faction; before the war rules, since
  // `FacWarCorpJoinRequestMsg` is no war.
  [
    /^(FW|FacWar)/,
    ({ fields }) => {
      const factionId = fieldId(fields, "factionID");
      return factionId === undefined
        ? undefined
        : { href: `/faction/${factionId}` };
    },
  ],
  // Wars, found from their sides.
  [
    /^(OfferedSurrender|AcceptedSurrender)$/,
    ({ fields, timestamp }) =>
      warTarget(
        fieldId(fields, "entityID"),
        fieldId(fields, "offeredID", "offeringID"),
        timestamp,
        true,
      ),
  ],
  [
    /^WarSurrenderOfferMsg$/,
    ({ fields, timestamp }) =>
      warTarget(
        fieldId(fields, "ownerID1"),
        fieldId(fields, "ownerID2"),
        timestamp,
        true,
      ),
  ],
  [/^WarSurrenderDeclinedMsg$/, entityFrom("ownerID")],
  [
    /^DeclareWar$/,
    ({ fields, timestamp }) =>
      warTarget(
        fieldId(fields, "entityID"),
        fieldId(fields, "defenderID"),
        timestamp,
      ),
  ],
  [/^AllWarCorpJoinedAllianceMsg$/, entityFrom("allianceID", "corpID")],
  [/^(MadeWarMutual|RetractsWar)$/, entityFrom("enemyID")],
  [/^AcceptedAlly$/, entityFrom("allyID", "enemyID")],
  [
    /War(?!ning)|Surrender|Ally|^MercOffer/,
    ({ fields, timestamp }) =>
      warTarget(
        fieldId(fields, "declaredByID", "aggressorID"),
        // Only the defender: an ally (`allyID`) is not a side of the war.
        fieldId(fields, "againstID", "defenderID"),
        timestamp,
      ),
  ],
  // About a corporation.
  [
    /^(CorpApp|CharApp|CorporationLeft|CorpKicked|CorpVote|CorpNews|CorpTaxChange|CorpDividend|CorpFriendlyFire|CorpLiquidation|CharMedal)/,
    entityFrom("corpID"),
  ],
  [/^CorpNewCEO/, entityFrom("newCeoID", "corpID")],
  [/^AllMaintenanceBill/, entityFrom("allianceID")],
  // About a place.
  [
    /^Orbital/,
    ({ fields }) => {
      const planetId = fieldId(fields, "planetID");
      return planetId !== undefined
        ? { href: `/planet/${planetId}` }
        : placeTarget(fieldId(fields, "solarSystemID"));
    },
  ],
  [
    /^(Station|CloneMoved|CloneRevoked|JumpCloneDeleted|ContainerPassword|ReimbursementMsg)/,
    placeFrom("newStationID", "stationID", "locationID", "solarSystemID"),
  ],
  [
    /^(Structures?|Moonmining|Skyhook|MercenaryDen|Sov|EntosisCapture|IHub|InfrastructureHub|Tower|AllAnchoring|AllStruc|AllianceCapitalChanged|CorpStructLost|OwnershipTransferred|CustomsMsg|IndustryTeamAuction)/,
    placeFrom("solarSystemID"),
  ],
  [/^(Incursion|Invasion)/, () => ({ href: "/incursions" })],
  [/^Alliance/, entityFrom("allianceID")],
];

/** Where clicking this notification should go, if anywhere. */
export function notificationTarget(
  context: NotificationContext,
): NotificationTarget | undefined {
  for (const [pattern, rule] of TARGET_RULES) {
    if (pattern.test(context.type)) return rule(context);
  }
  return undefined;
}

/** Literal text, or an id to render as that entity's name. */
export type SubjectPart = string | { id: number };

type SubjectRule = (fields: NotificationFields) => SubjectPart[] | undefined;

/** Parts joined, or undefined if any of them is missing. */
function parts(
  ...pieces: (string | number | undefined)[]
): SubjectPart[] | undefined {
  const result: SubjectPart[] = [];
  for (const piece of pieces) {
    if (piece === undefined) return undefined;
    result.push(typeof piece === "number" ? { id: piece } : piece);
  }
  return result;
}

/**
 * A free-text field (a vote's subject, a goal's name) as plain text: CCP's
 * strings can carry EVE markup and HTML entities.
 */
function textField(
  fields: NotificationFields,
  key: string,
): string | undefined {
  const value = fields.get(key.toLowerCase());
  if (value === undefined) return undefined;
  // As the client shows it: markup dropped, then entities decoded, so an
  // encoded `&lt;` reads as a literal `<`. The result is only ever rendered as
  // a text node. stripEveMarkup scans rather than running a one-pass tag regex,
  // which would leave `<script>` behind in `<scr<b>ipt>`.
  const text = decodeHtmlEntities(stripEveMarkup(value)).trim();
  return text === "" ? undefined : text;
}

/** "A vs B", or whichever side is named. */
const sides = (a: number | undefined, b: number | undefined) =>
  parts(a, " vs ", b) ?? parts(a) ?? parts(b);

/**
 * The line under a notification's title naming what it is about, in the spirit
 * of the in-game feed's "Invited to join …". Types without a rule show none.
 */
const SUBJECT_RULES: readonly (readonly [RegExp, SubjectRule])[] = [
  [/^KillReport/, (f) => parts(fieldId(f, "victimShipTypeID"))],
  [
    /^CorpAppInvitedMsg$/,
    (f) => parts("Invited to join ", fieldId(f, "corpID")),
  ],
  [
    /^CorpAppNewMsg$/,
    (f) =>
      parts(fieldId(f, "charID"), " applied to join ", fieldId(f, "corpID")),
  ],
  [
    /^(CharTerminationMsg|KillRight|BountyClaimMsg|BountyESS)/,
    (f) => parts(fieldId(f, "charID")),
  ],
  [/^BountyPlaced/, (f) => parts("Placed by ", fieldId(f, "bountyPlacerID"))],
  [
    /^CloneActivationMsg/,
    (f) => parts("Podded by ", fieldId(f, "podKillerID")),
  ],
  [
    /^(GameTimeReceived|GiftReceived)$/,
    (f) => parts("From ", fieldId(f, "senderCharID")),
  ],
  [/^GameTimeSent$/, (f) => parts("To ", fieldId(f, "receiverCharID"))],
  [
    /^LocateChar/,
    (f) =>
      parts(
        fieldId(f, "characterID"),
        " is in ",
        fieldId(f, "solarSystemID"),
      ) ?? parts(fieldId(f, "characterID")),
  ],
  [
    /^CharLeftCorpMsg$/,
    (f) => parts(fieldId(f, "charID"), " left ", fieldId(f, "corpID")),
  ],
  [/^(CorpApp|CharApp)/, (f) => parts(fieldId(f, "corpID"))],
  [/^CorpNewCEO/, (f) => parts("New CEO: ", fieldId(f, "newCeoID"))],
  [/^(CorpVoteMsg|OldLscMessages)$/, (f) => parts(textField(f, "subject"))],
  [/^CorporationGoal/, (f) => parts(textField(f, "goal_name"))],
  [/^(FW|FacWar)/, (f) => parts(fieldId(f, "factionID"))],
  [
    /^(OfferedSurrender|AcceptedSurrender)$/,
    (f) => sides(fieldId(f, "entityID"), fieldId(f, "offeredID", "offeringID")),
  ],
  [
    /^WarSurrenderOfferMsg$/,
    (f) => sides(fieldId(f, "ownerID1"), fieldId(f, "ownerID2")),
  ],
  [
    /^DeclareWar$/,
    (f) => sides(fieldId(f, "entityID"), fieldId(f, "defenderID")),
  ],
  [
    /^AllWarCorpJoinedAllianceMsg$/,
    (f) => parts(fieldId(f, "corpID"), " joined ", fieldId(f, "allianceID")),
  ],
  [
    /^AcceptedAlly$/,
    (f) =>
      parts(fieldId(f, "allyID"), " against ", fieldId(f, "enemyID")) ??
      parts(fieldId(f, "allyID")),
  ],
  [
    /War(?!ning)|Surrender|Ally|^MercOffer/,
    (f) =>
      sides(
        fieldId(f, "declaredByID", "aggressorID"),
        fieldId(f, "againstID", "defenderID", "enemyID", "ownerID"),
      ),
  ],
  [
    /^(Insurance|ReimbursementMsg)/,
    (f) => parts(fieldId(f, "typeID", "shipTypeID")),
  ],
  [/^Orbital/, (f) => parts(fieldId(f, "planetID"))],
  [
    /^(Structures?|Moonmining|Skyhook|MercenaryDen|OwnershipTransferred)/,
    (f) =>
      parts(
        fieldId(f, "structureTypeID"),
        " in ",
        fieldId(f, "solarSystemID"),
      ) ?? parts(fieldId(f, "solarSystemID")),
  ],
  [
    /^(Sov|EntosisCapture|IHub|InfrastructureHub|Tower|AllianceCapitalChanged|CustomsMsg)/,
    (f) => parts(fieldId(f, "solarSystemID")),
  ],
];

/** What this notification is about, for the line under its title. */
export function notificationSubject(
  type: string,
  fields: NotificationFields,
): SubjectPart[] | undefined {
  for (const [pattern, rule] of SUBJECT_RULES) {
    if (pattern.test(type)) return rule(fields);
  }
  return undefined;
}

/** SDE title placeholders, and the field naming what fills each. */
const TITLE_PLACEHOLDER_FIELDS: Readonly<Record<string, readonly string[]>> = {
  corp_name: ["corpID"],
  alliance_name: ["allianceID"],
  char_name: ["charID", "characterID"],
  character_name: ["charID", "characterID"],
};

/**
 * A title split into text and entity ids. CCP's display names are HTML-escaped
 * (`Fuel Depleted &amp; Offline`) and a few are templates the client fills in
 * (`Quit {corp_name}`). Undefined when a placeholder can't be filled, so the
 * caller falls back to a name made from the type.
 */
export function titleParts(
  title: string,
  fields: NotificationFields,
): SubjectPart[] | undefined {
  const decoded = decodeHtmlEntities(title);
  const pieces = decoded.split(/\{(\w+)\}/);
  const result: SubjectPart[] = [];
  for (const [index, piece] of pieces.entries()) {
    if (index % 2 === 0) {
      if (piece) result.push(piece);
      continue;
    }
    const keys = TITLE_PLACEHOLDER_FIELDS[piece];
    const id = keys ? fieldId(fields, ...keys) : undefined;
    if (id === undefined) return undefined;
    result.push({ id });
  }
  return result;
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decode the HTML entities CCP leaves in display names. */
export function decodeHtmlEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (entity, body: string) => {
      if (body.startsWith("#")) {
        const hex = body[1] === "x" || body[1] === "X";
        const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
        // fromCodePoint throws past U+10FFFF; leave a malformed entity as is.
        return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
    },
  );
}
