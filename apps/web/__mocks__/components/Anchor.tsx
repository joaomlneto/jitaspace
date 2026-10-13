/**
 * Lightweight stub for the `~/components/Anchor` barrel used in jest tests.
 *
 * The entity anchors used to live in @jitaspace/ui and @jitaspace/eve-components,
 * whose stubs covered them; they moved here with no change in behaviour, so
 * this stub keeps the stub behaviour existing apps/web tests assert on.
 * Registered for every test in jest.setup.ts (see there for why it is not a
 * moduleNameMapper rule). A test that wants a real anchor imports its file,
 * e.g. `~/components/Anchor/TypeListAnchor`, and a test can still override
 * this with jest.mock("~/components/Anchor", factory).
 */
import React from "react";

type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

// Wrapper anchors render their children so the linked label still appears in
// the DOM.
const childrenStub =
  () =>
  ({ children }: AnyProps) =>
    React.createElement("span", null, children);

// Entity anchors render a real <a> so tests can assert the destination. The
// href is omitted while the id is nullish, mirroring the real components —
// emitting `/race/undefined` is precisely the bug these stubs must not hide.
const anchorStub =
  (path: string, idProp: string, testid?: string) =>
  ({ children, ...props }: AnyProps) => {
    const id = props[idProp] as string | number | null | undefined;
    return React.createElement(
      "a",
      {
        ...(testid ? { "data-testid": testid } : null),
        ...(id === null || id === undefined ? null : { href: `${path}/${id}` }),
      },
      children,
    );
  };

// --- Id-to-route anchors ---
export const AllianceAnchor = anchorStub("/alliance", "allianceId");
export const BloodlineAnchor = anchorStub("/bloodline", "bloodlineId");
export const CategoryAnchor = anchorStub("/category", "categoryId");
export const CharacterAnchor = anchorStub("/character", "characterId");
export const CorporationAnchor = anchorStub(
  "/corporation",
  "corporationId",
  "corp-anchor",
);
export const DogmaAttributeAnchor = anchorStub(
  "/dogma/attribute",
  "attributeId",
);
export const DogmaEffectAnchor = anchorStub("/dogma/effect", "effectId");
export const DungeonAnchor = anchorStub("/dungeon", "dungeonId");
export const EpicArcAnchor = anchorStub("/epic-arc", "epicArcId");
export const FactionAnchor = anchorStub("/faction", "factionId");
export const GroupAnchor = anchorStub("/group", "groupId");
export const MarketGroupAnchor = anchorStub("/market-group", "marketGroupId");
export const MissionAnchor = anchorStub("/mission", "missionId");
export const RaceAnchor = anchorStub("/race", "raceId");
export const SolarSystemAnchor = anchorStub("/system", "solarSystemId");
export const StarAnchor = anchorStub("/star", "starId");
export const TypeAnchor = anchorStub("/type", "typeId", "type-anchor");
export const TypeListAnchor = anchorStub("/type-list", "typeListId");
export const WarAnchor = anchorStub("/war", "warId");

// --- Anchors that resolve their destination (render children) ---
export const ConstellationAnchor = childrenStub();
export const EveEntityAnchor = childrenStub();
export const EveEntityAnchorDisplay = childrenStub();
export const EveEntityNameAnchor = childrenStub();
export const EveMailSenderAnchor = childrenStub();
export const RegionAnchor = childrenStub();
export const StationAnchor = childrenStub();

// --- Data-fetching wrappers (render children) ---
export const CalendarEventOwnerAnchor = childrenStub();
export const OpenInformationWindowAnchor = childrenStub();
export const StargateDestinationAnchor = childrenStub();
export const WarAggressorAnchor = childrenStub();
export const WarDefenderAnchor = childrenStub();
