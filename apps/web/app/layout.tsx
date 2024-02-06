


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
import { Analytics } from "@vercel/analytics/react";

import { env } from "~/env.mjs";


export const metadata = {
  title: "My Mantine app",
  description: "I have followed setup instructions carefully",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  //const [queryClient] = React.useState(() => new QueryClient({}));

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

          {children}

          {/*
            <QueryClientProvider client={queryClient}>
              <ReactQueryDevtools initialIsOpen={false} />
              <ReactQueryStreamedHydration>
                <SessionProvider>
                  <EsiClientSSOAccessTokenInjector>
                    <EveIconsContextProvider>
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
              </ReactQueryStreamedHydration>
            </QueryClientProvider>
          */}
        </MantineProvider>
      </body>
    </html>
  );
}
