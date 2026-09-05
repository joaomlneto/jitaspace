import type { ReactNode } from "react";

import { pageMetadata } from "~/lib/metadata";

export const metadata = pageMetadata({
  title: "Fittings",
  description:
    "Browse and inspect EVE Online ship fittings — modules, cargo, and EFT import.",
  path: "/fittings",
  badge: "Fittings",
});

export default function RouteLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
