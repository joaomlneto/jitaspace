import React, { ReactNode } from "react";

import { MainLayout } from "~/layouts";

export default function RouteLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <MainLayout>{children}</MainLayout>;
}
