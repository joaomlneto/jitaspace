import { PropsWithChildren } from "react";

import {
  EsiClientContextProvider,
  EsiClientStatisticsProvider,
} from "../hooks";

export function JitaSpaceEsiClientContextProvider({
  children,
}: PropsWithChildren) {
  return (
    <EsiClientContextProvider>
      <EsiClientStatisticsProvider>{children}</EsiClientStatisticsProvider>
    </EsiClientContextProvider>
  );
}
