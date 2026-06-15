/**
 * Lightweight stub for @jitaspace/eve-components used in jest tests.
 *
 * These are the data-fetching ("smart") EVE components that moved out of
 * @jitaspace/ui. Their real barrel transitively imports @jitaspace/hooks
 * (which pulls @tanstack/db-ivm) and @tabler/icons-react — ESM that Next.js's
 * jest transformer can't compile — so it must never be loaded by tests.
 * Mapped via moduleNameMapper, mirroring the @jitaspace/ui stub. Components keep
 * the same stub behaviour they had when they lived in the @jitaspace/ui stub, so
 * existing apps/web tests keep passing.
 *
 * Tests that need custom behaviour can still call
 * jest.mock("@jitaspace/eve-components", factory) to override this stub.
 */
import React from "react";

type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

// Wrapper components (anchors, the online indicator) render their children so
// the linked label still appears in the DOM.
const childrenStub =
  (testid?: string) =>
  ({ children }: AnyProps) =>
    React.createElement("span", testid ? { "data-testid": testid } : null, children);

// --- Anchors (render children) ---
export const CalendarEventOwnerAnchor = childrenStub();
export const CharacterAnchor = childrenStub();
export const ConstellationAnchor = childrenStub();
export const EveEntityAnchor = childrenStub();
export const EveEntityNameAnchor = childrenStub();
export const EveMailSenderAnchor = childrenStub();
export const FactionAnchor = childrenStub();
export const RegionAnchor = childrenStub();
export const SolarSystemAnchor = childrenStub();
export const StargateDestinationAnchor = childrenStub();
export const StationAnchor = childrenStub();
export const TypeAnchor = childrenStub("type-anchor");
export const WarAggressorAnchor = childrenStub();
export const WarDefenderAnchor = childrenStub();

// --- Names (mirror the prior @jitaspace/ui stub output that tests assert on) ---
export const CharacterName = ({ characterId }: AnyProps) =>
  React.createElement("span", null, `char-${characterId}`);
export const CorporationName = ({ corporationId }: AnyProps) =>
  React.createElement("span", { "data-testid": "corp-name" }, `corp-${corporationId}`);
export const TypeName = ({ typeId }: AnyProps) =>
  React.createElement("span", { "data-testid": "type-name" }, `type-${typeId}`);
export const AllianceName = () => null;
export const AssetLocationName = () => null;
export const ConstellationName = () => null;
export const EveEntityName = () => null;
export const EveMailSenderName = () => null;
export const FactionName = () => null;
export const RegionName = () => null;
export const SolarSystemName = () => null;
export const StationName = () => null;
export const StructureName = () => null;
export const WarAggressorName = () => null;
export const WarDefenderName = () => null;

// --- Avatars / cards / selects / breadcrumbs / timeline (render nothing) ---
export const EveEntityAvatar = () => null;
export const EveIconAvatar = () => null;
export const EveMailSenderAvatar = () => null;
export const MarketGroupAvatar = () => null;
export const SolarSystemSovereigntyAvatar = () => null;
export const CalendarEventAttendeesAvatarGroup = () => null;
export const SolarSystemBreadcrumbs = () => null;
export const TypeInventoryBreadcrumbs = () => null;
export const TypeMarketBreadcrumbs = () => null;
export const AllianceCard = () => null;
export const CharacterCard = () => null;
export const EveEntityCard = () => null;
export const EveMailSenderCard = () => null;
export const EmailRecipientSearchMultiSelect = () => null;
export const EsiSearchMultiSelect = () => null;
export const EsiSearchMultiSelectItem = () => null;
export const AssetLocationSelect = () => null;
export const EsiSearchSelect = () => null;
export const EveEntitySelect = () => null;
export const CorporationAllianceHistoryTimeline = () => null;

// --- Wrappers that render children ---
export const CharacterOnlineIndicator = childrenStub();
