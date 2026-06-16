"use client";

import type { PropsWithChildren } from "react";
import React, { useContext, useMemo } from "react";

import type { EveIconsContextType, IconVersion } from "./context";
import { DEFAULT_EVE_ICONS_CONTEXT, DEFAULT_ICON_VERSION } from "./context";

export const EveIconsContext = React.createContext<EveIconsContextType>(
  DEFAULT_EVE_ICONS_CONTEXT,
);

export function useEveIconsConfig() {
  // `EveIconsContext` is created with a non-nullable default, so `useContext`
  // always returns a defined value even without a Provider above.
  return useContext(EveIconsContext);
}

export const EveIconsContextProvider = ({
  children,
  iconVersion,
}: PropsWithChildren<{ iconVersion?: IconVersion }>) => {
  const [selectedIconVersion, setSelectedIconVersion] =
    React.useState<IconVersion>(iconVersion ?? DEFAULT_ICON_VERSION);

  return (
    <EveIconsContext.Provider
      value={useMemo(
        () => ({
          iconVersion: selectedIconVersion,
          setIconVersion: setSelectedIconVersion,
        }),
        [selectedIconVersion],
      )}
    >
      {children}
    </EveIconsContext.Provider>
  );
};
