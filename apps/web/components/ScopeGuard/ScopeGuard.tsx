import { type PropsWithChildren, type ReactElement } from "react";
import { useSession } from "next-auth/react";

import { useEsiClientContext, type ESIScope } from "@jitaspace/esi-client";

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
  const { status } = useSession();
  const { scopes: grantedScopes } = useEsiClientContext();

  if (status === "loading") {
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
