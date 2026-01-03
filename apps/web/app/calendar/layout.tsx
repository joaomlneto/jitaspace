import React, { ReactNode } from "react";

import { ScopeGuard } from "~/components/ScopeGuard";
import { MainLayout } from "~/layouts";

export default function RouteLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <MainLayout>
      <ScopeGuard
        requiredScopes={[
          "esi-calendar.read_calendar_events.v1",
          "esi-calendar.respond_calendar_events.v1",
        ]}
      >
        {children}
      </ScopeGuard>
    </MainLayout>
  );
}
