import type { ReactNode } from "react";

import { ScopeGuard } from "~/components/ScopeGuard";
export default function RouteLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ScopeGuard
      requiredScopes={[
        "esi-mail.organize_mail.v1",
        "esi-mail.read_mail.v1",
        "esi-mail.send_mail.v1",
        "esi-search.search_structures.v1",
        "esi-characters.read_contacts.v1",
      ]}
    >
      {children}
    </ScopeGuard>
  );
}
