


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

import React from "react";
import Script from "next/script";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Analytics } from "@vercel/analytics/react";
import { SessionProvider } from "next-auth/react";
import { DefaultSeo } from "next-seo";

import { EveIconsContextProvider } from "@jitaspace/eve-icons";

import { EsiClientSSOAccessTokenInjector } from "~/components/EsiClientSSOAccessTokenInjector";
import { contextModals } from "~/components/Modals";
import RouterTransition from "~/components/RouterTransition";
import { JitaSpotlightProvider } from "~/components/Spotlight";
import { themes } from "~/themes";


export const metadata = {
  title: "My Mantine app",
  description: "I have followed setup instructions carefully",
};

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#abc2d9" />
        <meta name="apple-mobile-web-app-title" content="Jita" />
        <meta name="application-name" content="Jita" />
        <meta name="msapplication-TileColor" content="#abc2d9" />
        <meta name="theme-color" content="#abc2d9" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Progressive Web App (next-pwa) */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#9bb4d0" />
        <meta name="theme-color" content="#9bb4d0" />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/manifest.json" />
        {/*
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://www.jita.space" />
        <meta name="twitter:title" content="Jita" />
        <meta name="twitter:description" content="EVE Online Tools" />
        <meta name="twitter:image" content="/logo.png" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Jita" />
        <meta property="og:description" content="EVE Online Tools" />
        <meta property="og:site_name" content="Jita" />
        <meta property="og:url" content="https://www.jita.space" />
        <meta property="og:image" content="/api/opengraph/image" />
        */}
      </head>
      <body>
        <MantineProvider>
          <DefaultSeo
            defaultTitle="Jita"
            titleTemplate="%s | Jita"
            description="EVE Online Tools"
            openGraph={{
              title: "Jita",
              url: "https://www.jita.space",
              type: "website",
              images: [
                {
                  type: "image/png",
                  alt: "Jita",
                  //width: 1200,
                  //height: 630,
                  //url: "https://www.jita.space/api/opengraph/image",
                  //secureUrl: "https://www.jita.space/api/opengraph/image",
                  width: 176,
                  height: 168,
                  url: "https://www.jita.space/logo.png",
                  secureUrl: "https://www.jita.space/logo.png",
                },
              ],
              siteName: "Jita",
            }}
            twitter={{
              cardType: "summary",
              site: "https://www.jita.space",
            }}
            themeColor="#9bb4d0"
          />

          <Script
            strategy="afterInteractive"
            async
            defer
            // /analytics is a proxy to the umami server - set in next.config.mjs
            src={"/analytics/script.js"}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            data-domains="www.jita.space"
          ></Script>

          <Analytics />

          <QueryClientProvider client={queryClient}>
            <ReactQueryDevtools initialIsOpen={false} />

            <SessionProvider>
              <EsiClientSSOAccessTokenInjector>
                <EveIconsContextProvider /*iconVersion="rhea"*/>
                  <MantineProvider
                    defaultColorScheme="dark"
                    theme={themes.default}
                  >
                    <Notifications />
                    <RouterTransition />
                    <JitaSpotlightProvider>
                      <ModalsProvider
                        modals={contextModals}
                        modalProps={{ centered: true }}
                      >
                        {children}
                      </ModalsProvider>
                    </JitaSpotlightProvider>
                  </MantineProvider>
                </EveIconsContextProvider>
              </EsiClientSSOAccessTokenInjector>
            </SessionProvider>
          </QueryClientProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
