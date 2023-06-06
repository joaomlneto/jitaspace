import React, { useEffect, type ReactElement, type ReactNode } from "react";
import { type NextPage } from "next";
import { type AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { Analytics } from "@vercel/analytics/react";
import { SessionProvider, signIn } from "next-auth/react";
import { DefaultSeo } from "next-seo";

import { contextModals } from "~/components/Modals";
import RouterTransition from "../components/RouterTransition";
import AxiosContextProvider from "../contexts/axios";

type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page: ReactNode) => page);

  useEffect(() => {
    if ((session as { error?: string })?.error === "RefreshAccessTokenError") {
      void signIn("eveonline"); // Force sign in to hopefully resolve error
    }
  }, [session]);

  return (
    <>
      <Head>
        <title>JitaSpace</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
        />
      </Head>

      <DefaultSeo
        defaultTitle="Jita"
        titleTemplate="%s | Jita"
        description="EveMail is a web application that allows you to view your EVE Online mail in a more modern and user-friendly way."
      />

      <Script
        strategy="afterInteractive"
        async
        defer
        // /analytics is a proxy to the umami server - set in next.config.mjs
        src={"/analytics/script.js"}
        data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
      ></Script>

      <Analytics />

      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
      <SessionProvider session={session}>
        <AxiosContextProvider>
          <MantineProvider
            withGlobalStyles
            withNormalizeCSS
            theme={{ colorScheme: "dark" }}
          >
            <Notifications />
            <RouterTransition />
            <ModalsProvider
              modals={contextModals}
              modalProps={{ centered: true }}
            >
              {getLayout(<Component {...pageProps} />)}
            </ModalsProvider>
          </MantineProvider>
        </AxiosContextProvider>
      </SessionProvider>
    </>
  );
}
