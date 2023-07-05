import React, {
  useEffect,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from "react";
import { type NextPage } from "next";
import { type AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { Analytics } from "@vercel/analytics/react";
import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import { DefaultSeo } from "next-seo";

import {
  EsiClientContextProvider,
  getEveSsoAccessTokenPayload,
  JitaSpaceEsiClientContextProvider,
  useEsiClientContext,
  type ESIScope,
} from "@jitaspace/esi-client";
import { EveIconsContextProvider } from "@jitaspace/eve-icons";

import { contextModals } from "~/components/Modals";
import { ScopeGuard } from "~/components/ScopeGuard";
import { JitaSpotlightProvider } from "~/components/Spotlight";
import RouterTransition from "../components/RouterTransition";

type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
  requiredScopes?: ESIScope[];
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
  session: Session;
};

/**
 * Inject the token obtained from next-auth into our ESI Client
 */
const EsiClientSSOAccessTokenInjector = ({ children }: PropsWithChildren) => {
  const { data: session, status, update } = useSession();
  const { setAuth } = useEsiClientContext();

  // decode token payload
  const tokenPayload = useMemo(
    () => getEveSsoAccessTokenPayload(session?.accessToken),
    [session?.accessToken],
  );

  // refresh token if
  useEffect(() => {
    if (!tokenPayload) return;
    const expDate = new Date(tokenPayload.exp * 1000);
    const timeUntilExpiration = () => expDate.getTime() - new Date().getTime();
    console.log("time until expiration:", timeUntilExpiration());
    const timer = setTimeout(() => {
      console.log(
        `updating session: token expires in ${
          timeUntilExpiration() / 1000
        } seconds`,
      );
      void update();
    }, Math.max(timeUntilExpiration() - 30000, 5000));
    return () => clearTimeout(timer);
  }, [tokenPayload, update]);

  useEffect(() => {
    setAuth({
      accessToken: session?.accessToken,
      loading: status === "loading",
    });
  }, [session?.accessToken, setAuth, status]);

  return useMemo(() => children, [children]);
};

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page: ReactNode) => page);
  const requiredScopes = Component.requiredScopes;

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover"
        />
      </Head>

      <DefaultSeo
        defaultTitle="Jita"
        titleTemplate="%s | Jita"
        description="EVE Online Tools"
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
        {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access */}
        <EsiClientContextProvider accessToken={session?.accessToken}>
          <JitaSpaceEsiClientContextProvider>
            <EsiClientSSOAccessTokenInjector>
              <EveIconsContextProvider /* iconVersion="rhea"*/>
                <MantineProvider
                  withGlobalStyles
                  withNormalizeCSS
                  theme={{ colorScheme: "dark" }}
                >
                  <Notifications />
                  <RouterTransition />
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
          </JitaSpaceEsiClientContextProvider>
        </EsiClientContextProvider>
      </SessionProvider>
    </>
  );
}
