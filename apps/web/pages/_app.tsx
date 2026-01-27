


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

import type { NextPage } from "next";
import type { Session } from "next-auth";
import type { AppProps } from "next/app";
import type { ReactElement, ReactNode } from "react";
import React from "react";
import Head from "next/head";
import Script from "next/script";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { GoogleAnalytics } from "@next/third-parties/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SessionProvider } from "next-auth/react";
import { DefaultSeo } from "next-seo";

import type { ESIScope } from "@jitaspace/esi-metadata";
import { EveIconsContextProvider } from "@jitaspace/eve-icons";

import { EsiClientSSOAccessTokenInjector } from "~/components/EsiClientSSOAccessTokenInjector";
import { contextModals } from "~/components/Modals";
import { ScopeGuard } from "~/components/ScopeGuard";
import { JitaSpotlightProvider } from "~/components/Spotlight";
import { env } from "~/env";
import { themes } from "~/themes";
import RouterTransition from "../components/RouterTransition";


type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
  requiredScopes?: ESIScope[];
};

type AppPropsWithLayout = AppProps<{
  session: Session;
}> & {
  Component: NextPageWithLayout;
};

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page: ReactNode) => page);
  const requiredScopes = Component.requiredScopes;

  const [queryClient, setQueryClient] = React.useState(() => new QueryClient());

  return (
    <>
      <Head>
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
      </Head>

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

      {/* Analytics: Umami, Vercel, Google */}
      <Script // TODO: managed by ConsentManager
        strategy="afterInteractive"
        async
        defer
        // /analytics is a proxy to the umami server - set in next.config.mjs
        src={"/analytics/script.js"}
        data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
        data-domains="www.jita.space"
      ></Script>
      {env.NEXT_PUBLIC_GOOGLE_TAG_ID && ( // TODO: managed by ConsentManager
        <GoogleAnalytics gaId={env.NEXT_PUBLIC_GOOGLE_TAG_ID} />
      )}
      <Analytics />
      <SpeedInsights />

      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <SessionProvider session={session}>
          <EsiClientSSOAccessTokenInjector>
            <EveIconsContextProvider /*iconVersion="rhea"*/>
              <MantineProvider defaultColorScheme="dark" theme={themes.default}>
                <Notifications />
                <RouterTransition />
                {/*<MainSpotlight />*/}
                <JitaSpotlightProvider>
                  <ModalsProvider
                    modals={contextModals}
                    modalProps={{ centered: true }}
                  >
                    {getLayout(
                      <ScopeGuard requiredScopes={requiredScopes}>
                        <Component {...pageProps} />
                      </ScopeGuard>,
                    )}
                  </ModalsProvider>
                </JitaSpotlightProvider>
              </MantineProvider>
            </EveIconsContextProvider>
          </EsiClientSSOAccessTokenInjector>
        </SessionProvider>
      </QueryClientProvider>
    </>
  );
}
