"use client";

import React, { useContext, useMemo, type PropsWithChildren } from "react";





export const ICON_VERSIONS = ["castor", "incarna", "rhea"] as const;

export type IconVersion = (typeof ICON_VERSIONS)[number];
export const DEFAULT_ICON_VERSION: IconVersion = "rhea";

type EveIconsContextType = {
  iconVersion: IconVersion;
  setIconVersion: (version: IconVersion) => void;
};

const defaultContext: EveIconsContextType = {
  iconVersion: DEFAULT_ICON_VERSION,
  setIconVersion: () => {
    /* do nothing */
  },
};

const EveIconsContext =
  React.createContext<EveIconsContextType>(defaultContext);

export const EveIconsContextProvider = ({
  children,
  iconVersion,
}: PropsWithChildren<{ iconVersion?: IconVersion }>) => {
  const [selectedIconVersion, setIconVersion] = React.useState<IconVersion>(
    iconVersion ?? DEFAULT_ICON_VERSION,
  );

  return (
    <EveIconsContext.Provider
      value={useMemo(
        () => ({
          iconVersion: selectedIconVersion,
          setIconVersion,
        }),
        [selectedIconVersion],
      )}
    >
      {children}
    </EveIconsContext.Provider>
  );
};

export function useEveIconsConfig() {
  const ctx = useContext(EveIconsContext);

  // if context not found, return default context.
  if (!ctx) return defaultContext;

  return ctx;
}
