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
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import { DefaultSeo } from "next-seo";

import { type ESIScope } from "@jitaspace/esi-client";
import {
  EsiClientContextProvider,
  getEveSsoAccessTokenPayload,
  JitaSpaceEsiClientContextProvider,
  useEsiClientContext,
} from "@jitaspace/esi-hooks";
import { EveIconsContextProvider } from "@jitaspace/eve-icons";

import { contextModals } from "~/components/Modals";
import { ScopeGuard } from "~/components/ScopeGuard";
import { api } from "~/utils/api";
import RouterTransition from "../components/RouterTransition";

const queryClient = new QueryClient();

type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
  requiredScopes?: ESIScope[];
};

type AppPropsWithLayout = AppProps<{
  session: Session;
}> & {
  Component: NextPageWithLayout;
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
    const timer = setTimeout(
      () => {
        console.log(
          `updating session: token expires in ${
            timeUntilExpiration() / 1000
          } seconds`,
        );
        void update();
      },
      Math.max(timeUntilExpiration() - 30000, 5000),
    );
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

const App = ({
  Component,
  pageProps: { session, ...pageProps },
}: AppPropsWithLayout) => {
  const getLayout = Component.getLayout ?? ((page: ReactNode) => page);
  const requiredScopes = Component.requiredScopes;

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
        <link rel="manifest" href="/manifest.json" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://42outunis.com" />
        <meta name="twitter:title" content="The Outuni Project" />
        <meta name="twitter:description" content="EVE Online Tools" />
        <meta name="twitter:image" content="/logo.png" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="The Outuni Project" />
        <meta
          property="og:description"
          content="EVE Online Incursion Community"
        />
        <meta property="og:site_name" content="The Outuni Project" />
        <meta property="og:url" content="https://42outunis.com" />
      </Head>

      <DefaultSeo
        defaultTitle="The Outuni Project"
        titleTemplate="%s | The Outuni Project"
        description="EVE Online Incursions Community"
        twitter={{
          site: "https://42outunis.com",
        }}
        themeColor="#9bb4d0"
      />

      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <SessionProvider session={session}>
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
                  </MantineProvider>
                </EveIconsContextProvider>
              </EsiClientSSOAccessTokenInjector>
            </JitaSpaceEsiClientContextProvider>
          </EsiClientContextProvider>
        </SessionProvider>
      </QueryClientProvider>
    </>
  );
};

export default api.withTRPC(App);
