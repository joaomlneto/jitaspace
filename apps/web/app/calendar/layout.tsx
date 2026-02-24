import type { ReactNode } from "react";

import { ScopeGuard } from "~/components/ScopeGuard";
export default function RouteLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ScopeGuard
      requiredScopes={[
        "esi-calendar.read_calendar_events.v1",
        "esi-calendar.respond_calendar_events.v1",
      ]}
    >
      {children}
    </ScopeGuard>
  );
}
