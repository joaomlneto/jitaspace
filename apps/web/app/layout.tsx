import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/code-highlight/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/carousel/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/nprogress/styles.css";
import "mantine-react-table/styles.css";
import "mantine-datatable/styles.css";

import type { Viewport } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import Script from "next/script";
import { ColorSchemeScript } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { EsiClientSSOAccessTokenInjector } from "~/components/EsiClientSSOAccessTokenInjector";
import { contextModals } from "~/components/Modals";
import { RouterTransition } from "~/components/RouterTransition.tsx";
import { MainSpotlight } from "~/components/Spotlight";
import { env } from "~/env";
import { MainLayout } from "~/layouts";
import { MyQueryClientProvider } from "~/lib/MyQueryClientProvider";
import { DEFAULT_ESI_ACCEPT_LANGUAGE } from "~/lib/preferences";
import { AppMantineProvider } from "./mantine-provider";

const APP_NAME = "JitaSpace";
const APP_DEFAULT_TITLE = "JitaSpace";
const APP_TITLE_TEMPLATE = "%s | JitaSpace";
const APP_DESCRIPTION =
  "EVE Online companion app — browse items, characters, corporations, market data, ship fittings, and more.";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.jita.space";
const ESI_USER_AGENT = "jitaspace-web/0.1.0 (https://jita.space)";
const ESI_ACCEPT_LANGUAGE = DEFAULT_ESI_ACCEPT_LANGUAGE;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    // black-translucent lets the web app draw behind the iOS status bar so the
    // dark header extends edge-to-edge (paired with viewport-fit=cover below).
    statusBarStyle: "black-translucent",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/api/opengraph/image",
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    images: ["/api/opengraph/image"],
  },
};

export const viewport: Viewport = {
  // Matches the manifest theme_color and the dark app header so the installed
  // PWA title bar (and mobile status bar) blend with the UI. The runtime
  // theme-color meta tag takes precedence over the manifest, so keep them in sync.
  themeColor: "#04070c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const defaultColorScheme = "dark";
  return (
    <html lang="en" dir="ltr" data-mantine-color-scheme={defaultColorScheme}>
      <head>
        <ColorSchemeScript defaultColorScheme={defaultColorScheme} />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover"
        />
      </head>
      <body>
        <Script
          strategy="afterInteractive"
          async
          defer
          // /analytics is a proxy to the umami server - set in next.config.mjs
          src={"/analytics/script.js"}
          data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          data-domains="www.jita.space"
        ></Script>
        {env.NEXT_PUBLIC_GOOGLE_TAG_ID && (
          <GoogleAnalytics gaId={env.NEXT_PUBLIC_GOOGLE_TAG_ID} />
        )}
        <Analytics />
        <SpeedInsights />
        <AppMantineProvider>
          <MyQueryClientProvider
            esiUserAgent={ESI_USER_AGENT}
            esiAcceptLanguage={ESI_ACCEPT_LANGUAGE}
          >
            <EsiClientSSOAccessTokenInjector>
              <>
                {/* Mantine 9 changed the default so hovering any notification
                    pauses all timers; keep the previous per-notification behavior. */}
                <Notifications pauseResetOnHover="notification" />
                <Suspense fallback={null}>
                  <RouterTransition />
                </Suspense>
                <MainSpotlight />
                <ModalsProvider
                  modals={contextModals}
                  modalProps={{ centered: true }}
                >
                  <MainLayout>{children}</MainLayout>
                </ModalsProvider>
              </>
            </EsiClientSSOAccessTokenInjector>
          </MyQueryClientProvider>
        </AppMantineProvider>
      </body>
    </html>
  );
}
