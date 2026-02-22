"use client";

import React, { useContext, useMemo, type PropsWithChildren } from "react";

import {
  DEFAULT_EVE_ICONS_CONTEXT,
  DEFAULT_ICON_VERSION,
  type EveIconsContextType,
  type IconVersion,
} from "./context";

export const EveIconsContext =
  React.createContext<EveIconsContextType>(DEFAULT_EVE_ICONS_CONTEXT);

export function useEveIconsConfig() {
  const ctx = useContext(EveIconsContext);
  return ctx ?? DEFAULT_EVE_ICONS_CONTEXT;
}

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
