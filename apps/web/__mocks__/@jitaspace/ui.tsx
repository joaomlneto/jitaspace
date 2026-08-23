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
 */
import React from "react";

// Entity anchors render a real <a> so tests can assert the destination. The
// href is omitted while the id is nullish, mirroring the real components —
// emitting `/race/undefined` is precisely the bug these stubs must not hide.
const anchorStub =
  (path: string, idProp: string, testid?: string) =>
  ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) => {
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

// --- Corporation ---
export const CorporationAnchor = anchorStub(
  "/corporation",
  "corporationId",
  "corp-anchor",
);

// --- Race / Bloodline (SDE reference data, not ESI-resolvable entities) ---
export const RaceAnchor = anchorStub("/race", "raceId");
export const BloodlineAnchor = anchorStub("/bloodline", "bloodlineId");

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
export const TypeAnchor = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("span", { "data-testid": "type-anchor" }, children);

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
export const StationAnchor = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("span", null, children);
export const CharacterAnchor = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("span", null, children);
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
