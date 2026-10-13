/**
 * Lightweight stub for @jitaspace/ui used in jest tests.
 *
 * The real @jitaspace/ui barrel imports every component, some of which pull
 * in @tabler/icons-react (ESM-only) that Next.js's jest transformer can't
 * compile.  Mapping this stub via moduleNameMapper ensures the real source is
 * never loaded by tests that don't explicitly call jest.mock("@jitaspace/ui").
 *
 * Tests that need custom mock behaviour (e.g. dataTables.test.tsx) can still
 * call jest.mock("@jitaspace/ui", factory) — the explicit factory overrides
 * this stub for that test file.
 *
 * The entity anchors and HoverPrefetchLink moved to apps/web; their stubs live
 * in __mocks__/components/Anchor.tsx.
 */
import React from "react";

// --- Dogma (the value formatter is pure, so the real one is used) ---
export {
  dogmaAttributeDisplayValue,
  formatDogmaAttributeValue,
} from "../../../../packages/ui/Text/DogmaAttributeValue";

// --- Corporation ---
export const CorporationAvatar = () =>
  React.createElement("span", { "data-testid": "corp-avatar" });

export const CorporationName = ({
  corporationId,
}: {
  corporationId?: number;
}) =>
  React.createElement(
    "span",
    { "data-testid": "corp-name" },
    `corp-${corporationId}`,
  );

// --- Icons ---
export const EveIconAvatar = () =>
  React.createElement("span", { "data-testid": "eve-icon-avatar" });

// --- Type (item) ---
// The TypeAvatar split left a presentational twin in @jitaspace/ui (the smart
// one lives in @jitaspace/eve-components and has its own stub). It is the only
// name both real packages export, so both stubs must cover it.
export const TypeAvatar = () =>
  React.createElement("span", { "data-testid": "type-avatar" });

export const TypeName = ({
  typeId,
  span: _span,
  size: _size,
  lineClamp: _lc,
}: {
  typeId?: number;
  span?: boolean;
  size?: string;
  lineClamp?: number;
}) =>
  React.createElement("span", { "data-testid": "type-name" }, `type-${typeId}`);

// --- Generic entity name (pure renderer of an already-resolved name) ---
export const EveEntityNameDisplay = ({
  name,
  loading: _loading,
  span: _span,
  size: _size,
  lineClamp: _lc,
}: {
  name?: string | null;
  loading?: boolean;
  span?: boolean;
  size?: string;
  lineClamp?: number;
}) =>
  React.createElement(
    "span",
    { "data-testid": "entity-name" },
    name ?? "Unknown",
  );

// --- ISK ---
export const ISKAmount = ({
  amount,
  inherit: _i,
  ta: _t,
}: {
  amount?: number;
  inherit?: boolean;
  ta?: string;
}) =>
  React.createElement(
    "span",
    { "data-testid": "isk-amount" },
    amount?.toLocaleString() ?? "",
  );

// --- Misc stubs so imports that destructure other exports don't crash ---
export const EveEntitySelect = () => null;
export const AllianceTickerBadge = () => null;
export const StationName = () => null;
export const CharacterAvatar = () => null;
export const CharacterName = ({ characterId }: { characterId?: number }) =>
  React.createElement("span", null, `char-${characterId}`);
export const TimeAgoText = () => null;

// --- Alliance / Faction avatars ---
export const AllianceAvatar = () => null;
export const FactionAvatar = () => null;

// --- Dates ---
// The hover card renders its children so the wrapped date still reaches the DOM.
export const DateHoverCard = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("span", { "data-testid": "date-hover-card" }, children);
export const FormattedDateText = () => null;
