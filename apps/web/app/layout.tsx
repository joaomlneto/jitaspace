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

import React, { ReactNode } from "react";
import { Viewport } from "next";
import Script from "next/script";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { Analytics } from "@vercel/analytics/react";

import { EveIconsContextProvider } from "@jitaspace/eve-icons";

import { EsiClientSSOAccessTokenInjector } from "~/components/EsiClientSSOAccessTokenInjector";
import { contextModals } from "~/components/Modals";
import { RouterTransitionAppDir } from "~/components/RouterTransitionAppDir";
import { JitaSpotlightProvider } from "~/components/Spotlight";
import { env } from "~/env.mjs";
import { MyQueryClientProvider } from "~/lib/MyQueryClientProvider";
import { MySessionProvider } from "~/lib/MySessionProvider";

const APP_NAME = "JitaSpace";
const APP_DEFAULT_TITLE = "JitaSpace";
const APP_TITLE_TEMPLATE = "%s | " + APP_NAME;
const APP_DESCRIPTION = "EVE Online tools";

export const metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
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
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#9bb4d0",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover"
        />
      </head>
      <body>
        <MantineProvider defaultColorScheme="dark" /*theme={themes.default}*/>
          <Script
            strategy="afterInteractive"
            async
            defer
            // /analytics is a proxy to the umami server - set in next.config.mjs
            src={"/analytics/script.js"}
            data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            data-domains="www.jita.space"
          ></Script>

          <Analytics />

          <MyQueryClientProvider>
            <MySessionProvider>
              <EsiClientSSOAccessTokenInjector>
                <EveIconsContextProvider>
                  <>
                    <Notifications />
                    <RouterTransitionAppDir />
                    <JitaSpotlightProvider>
                      <ModalsProvider
                        modals={contextModals}
                        modalProps={{ centered: true }}
                      >
                        {children}
                      </ModalsProvider>
                    </JitaSpotlightProvider>
                  </>
                </EveIconsContextProvider>
              </EsiClientSSOAccessTokenInjector>
            </MySessionProvider>
          </MyQueryClientProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
