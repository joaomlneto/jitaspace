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

// --- Corporation ---
export const CorporationAnchor = ({
  children,
}: {
  children?: React.ReactNode;
}) => React.createElement("span", { "data-testid": "corp-anchor" }, children);

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

// --- Type (item) ---
export const TypeAnchor = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("span", { "data-testid": "type-anchor" }, children);

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
  React.createElement(
    "span",
    { "data-testid": "type-name" },
    `type-${typeId}`,
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
export const CharacterAnchor = ({
  children,
}: {
  children?: React.ReactNode;
}) => React.createElement("span", null, children);
export const CharacterAvatar = () => null;
export const CharacterName = ({ characterId }: { characterId?: number }) =>
  React.createElement("span", null, `char-${characterId}`);
export const TimeAgoText = () => null;
