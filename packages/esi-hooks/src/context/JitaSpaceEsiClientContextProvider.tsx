import { type PropsWithChildren } from "react";

import { EsiClientContextProvider } from "../hooks";

export function JitaSpaceEsiClientContextProvider({
  children,
}: PropsWithChildren) {
  return <EsiClientContextProvider>{children}</EsiClientContextProvider>;
}
