import type { ESIScope } from "@jitaspace/esi-metadata";

import type { AppScopeSet, JitaApp } from "~/config/apps";

const hasAllScopes = (
  grantedScopes: ESIScope[],
  requiredScopes: ESIScope[],
) => {
  return requiredScopes.every((scope) => grantedScopes.includes(scope));
};

const hasOptionalAccess = (
  grantedScopes: ESIScope[],
  optionalScopeSets?: AppScopeSet[],
) => {
  if (!optionalScopeSets || optionalScopeSets.length === 0) {
    return true;
  }

  return optionalScopeSets.some((scopeSet) =>
    hasAllScopes(grantedScopes, scopeSet.scopes),
  );
};

export const hasAppAccess = (grantedScopes: ESIScope[], app: JitaApp) => {
  const requiredScopeSets = app.scopes.required ?? [];
  const hasRequiredAccess = requiredScopeSets.every((scopeSet) =>
    hasAllScopes(grantedScopes, scopeSet.scopes),
  );

  return (
    hasRequiredAccess && hasOptionalAccess(grantedScopes, app.scopes.optional)
  );
};

export const getEnabledApps = (
  apps: Record<string, JitaApp>,
  grantedScopes: ESIScope[],
) => {
  return Object.values(apps).filter((app) => hasAppAccess(grantedScopes, app));
};
