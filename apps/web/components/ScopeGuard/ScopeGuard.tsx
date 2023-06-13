import { type PropsWithChildren } from "react";

import { type ESIScope } from "@jitaspace/esi-client";

import { useTokenScopes } from "~/hooks";
import { RequestPermissionsBanner } from "./RequestPermissionsBanner";

type ScopeWallProps = {
  requiredScopes: ESIScope[];
};

export function ScopeGuard({
  requiredScopes,
  children,
}: PropsWithChildren<ScopeWallProps>) {
  const { grantedScopes } = useTokenScopes();

  if (
    requiredScopes.some(
      (requiredScope) =>
        !grantedScopes || !grantedScopes.includes(requiredScope),
    )
  ) {
    return <RequestPermissionsBanner requiredScopes={requiredScopes} />;
  }

  return children;
}
