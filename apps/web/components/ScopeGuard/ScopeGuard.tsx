"use client";

import type { PropsWithChildren, ReactElement } from "react";
import { useMemo } from "react";

import { type ESIScope } from "@jitaspace/esi-metadata";
import { useSelectedCharacter } from "@jitaspace/hooks";

import { RequestPermissionsBanner } from "./RequestPermissionsBanner";

export type ScopeGuardProps = {
  requiredScopes?: ESIScope[];
  loadingScopesComponent?: ReactElement<any>;
  insufficientScopesComponent?: ReactElement<any>;
};

export function ScopeGuard({
  requiredScopes = [],
  loadingScopesComponent,
  insufficientScopesComponent,
  children,
}: PropsWithChildren<ScopeGuardProps>) {
  const selectedCharacter = useSelectedCharacter();
  const grantedScopes = useMemo(
    () => selectedCharacter?.accessTokenPayload.scp ?? [],
    [selectedCharacter],
  );

  // If no scopes are required, just pass through.
  if (requiredScopes.length === 0) return children;

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
