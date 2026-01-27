import type { PropsWithChildren } from "react";

import { MainLayout } from "~/layouts";


export default function Layout({ children }: PropsWithChildren) {
  return <MainLayout>{children}</MainLayout>;
}
