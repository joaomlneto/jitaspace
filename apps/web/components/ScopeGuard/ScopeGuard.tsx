"use client";

import type { PropsWithChildren, ReactElement } from "react";
import { useMemo } from "react";

import type {ESIScope} from "@jitaspace/esi-metadata";
import { useSelectedCharacter } from "@jitaspace/hooks";

import { useAuthStoreHasHydrated } from "~/hooks/useAuthStoreHasHydrated";

import { RequestPermissionsBanner } from "./RequestPermissionsBanner";

export interface ScopeGuardProps {
  requiredScopes?: ESIScope[];
  loadingScopesComponent?: ReactElement;
  insufficientScopesComponent?: ReactElement;
}

export function ScopeGuard({
  requiredScopes = [],
  loadingScopesComponent,
  insufficientScopesComponent,
  children,
}: PropsWithChildren<ScopeGuardProps>) {
  const selectedCharacter = useSelectedCharacter();
  const hasHydrated = useAuthStoreHasHydrated();
  const grantedScopes = useMemo(
    () => selectedCharacter?.accessTokenPayload.scp ?? [],
    [selectedCharacter],
  );

  // If no scopes are required, just pass through.
  if (requiredScopes.length === 0) return children;

  // The persisted session hasn't rehydrated yet, so we don't know whether the
  // user has the required scopes. Show the loading placeholder (which can
  // reserve the content's space) instead of briefly flashing the permission
  // banner before the session loads.
  if (!hasHydrated) return loadingScopesComponent ?? null;

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
