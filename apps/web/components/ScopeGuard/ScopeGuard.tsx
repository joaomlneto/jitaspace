import { type PropsWithChildren, type ReactElement } from "react";

import { type ESIScope } from "@jitaspace/esi-client";

import { useTokenScopes } from "~/hooks";
import { RequestPermissionsBanner } from "./RequestPermissionsBanner";

export type ScopeGuardProps = {
  requiredScopes: ESIScope[];
  loadingScopesComponent?: ReactElement;
  insufficientScopesComponent?: ReactElement;
};

export function ScopeGuard({
  requiredScopes,
  loadingScopesComponent,
  insufficientScopesComponent,
  children,
}: PropsWithChildren<ScopeGuardProps>) {
  const { grantedScopes, loading } = useTokenScopes();

  if (requiredScopes.length > 0 && loading) {
    return loadingScopesComponent ?? <div>Loading...</div>;
  }

  if (
    requiredScopes.some(
      (requiredScope) =>
        !grantedScopes || !grantedScopes.includes(requiredScope),
    )
  ) {
    return (
      insufficientScopesComponent ?? (
        <RequestPermissionsBanner requiredScopes={requiredScopes} />
      )
    );
  }

  return children;
}
