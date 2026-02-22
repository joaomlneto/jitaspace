export const ICON_VERSIONS = ["castor", "incarna", "rhea"] as const;

export type IconVersion = (typeof ICON_VERSIONS)[number];
export const DEFAULT_ICON_VERSION: IconVersion = "rhea";

export type EveIconsContextType = {
  iconVersion: IconVersion;
  setIconVersion: (version: IconVersion) => void;
};
export const DEFAULT_EVE_ICONS_CONTEXT: EveIconsContextType = {
  iconVersion: DEFAULT_ICON_VERSION,
  setIconVersion: () => {
    /* no-op default */
  },
};
