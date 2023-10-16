import { type PropsWithChildren, type ReactElement } from "react";
import { Group, Loader } from "@mantine/core";

import { type ESIScope } from "@jitaspace/esi-metadata";
import { useEsiClientContext } from "@jitaspace/hooks";

import { RequestPermissionsBanner } from "./RequestPermissionsBanner";

export type ScopeGuardProps = {
  requiredScopes?: ESIScope[];
  loadingScopesComponent?: ReactElement;
  insufficientScopesComponent?: ReactElement;
};

export function ScopeGuard({
  requiredScopes = [],
  loadingScopesComponent,
  insufficientScopesComponent,
  children,
}: PropsWithChildren<ScopeGuardProps>) {
  const { scopes: grantedScopes, loading } = useEsiClientContext();

  // If no scopes are required, just pass through.
  if (requiredScopes.length === 0) return children;

  // Are we still loading? If so, display something...
  if (loading) {
    return (
      loadingScopesComponent ?? (
        <Group>
          <Loader size="sm" />
          Loading session
        </Group>
      )
    );
  }

  // Scopes are missing! Do not display children.
  if (
    requiredScopes.some(
      (requiredScope) => !grantedScopes.includes(requiredScope),
    )
  ) {
    return (
      insufficientScopesComponent ?? (
        <RequestPermissionsBanner requiredScopes={requiredScopes} />
      )
    );
  }

  // We are authenticated and have the required scopes. Render children.
  return children;
}
