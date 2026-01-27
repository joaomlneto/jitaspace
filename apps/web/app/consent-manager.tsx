import type { ReactNode } from "react";
import { ConsentManagerDialog, ConsentManagerProvider } from "@c15t/nextjs";

import { PrivacyBanner } from "~/components/privacy/PrivacyBanner.tsx";
import { CONSENT_OPTIONS } from "~/config/consent.ts";

export default function ConsentManager({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ConsentManagerProvider options={CONSENT_OPTIONS}>
      <PrivacyBanner />
      <ConsentManagerDialog />
      {children}
    </ConsentManagerProvider>
  );
}
