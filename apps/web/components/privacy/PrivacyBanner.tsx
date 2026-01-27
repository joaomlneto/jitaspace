"use client";

import { CookieBanner } from "@c15t/nextjs/pages";

export const PrivacyBanner = () => {
  return (
    <CookieBanner.Root>
      <CookieBanner.Card>
        <CookieBanner.Header>
          <CookieBanner.Title>We value your privacy!</CookieBanner.Title>
          <CookieBanner.Description>
            This website uses cookies for necessary functionality, as well as to
            analyze user behavior and issues. for more information.
          </CookieBanner.Description>
        </CookieBanner.Header>
        <CookieBanner.Footer>
          <CookieBanner.FooterSubGroup>
            <CookieBanner.AcceptButton themeKey="banner.footer.customize-button">
              Accept All
            </CookieBanner.AcceptButton>
            <CookieBanner.RejectButton themeKey="banner.footer.customize-button">
              Decline All
            </CookieBanner.RejectButton>
          </CookieBanner.FooterSubGroup>
          <CookieBanner.CustomizeButton themeKey="banner.footer.customize-button">
            Preferences
          </CookieBanner.CustomizeButton>
        </CookieBanner.Footer>
      </CookieBanner.Card>
    </CookieBanner.Root>
  );
};
