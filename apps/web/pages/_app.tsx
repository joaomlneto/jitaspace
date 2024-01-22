import "@mantine/core/styles.css";
import '@mantine/charts/styles.css';
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/code-highlight/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/carousel/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/nprogress/styles.css";
import "mantine-react-table/styles.css";

import {type ESIScope} from "@jitaspace/esi-metadata";
import {EveIconsContextProvider} from "@jitaspace/eve-icons";
import {useAuthStore} from "@jitaspace/hooks";
import {MantineProvider} from "@mantine/core";
import {ModalsProvider} from "@mantine/modals";
import {Notifications, showNotification} from "@mantine/notifications";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {ReactQueryDevtools} from "@tanstack/react-query-devtools";
import {Analytics} from "@vercel/analytics/react";
import {type NextPage} from "next";
import type {Session} from "next-auth";
import {SessionProvider, useSession} from "next-auth/react";
import {DefaultSeo} from "next-seo";
import {type AppProps} from "next/app";
import Head from "next/head";
import Script from "next/script";

import React, {type PropsWithChildren, type ReactElement, type ReactNode, useEffect,} from "react";
import {Workbox} from "workbox-window";
import z from "zod";

import {contextModals} from "~/components/Modals";
import {ScopeGuard} from "~/components/ScopeGuard";
import {JitaSpotlightProvider} from "~/components/Spotlight";
import {themes} from "~/themes";
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

/**
 * Inject the token obtained from next-auth into our ESI Client
 */
const EsiClientSSOAccessTokenInjector = ({children}: PropsWithChildren) => {
  const {data: session, status, update} = useSession();
  const {addCharacter, characters} = useAuthStore();

  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  // This useEffect is here to import the current next-auth token (if available)
  useEffect(() => {
    if (session) {
      console.log({session});
      addCharacter({
        accessToken: session.accessToken,
        refreshToken: session.encryptedRefreshToken,
      });
    }
  }, [session?.accessToken, session?.encryptedRefreshToken]);

  // this refreshes tokens that expired or are close to expiring
  useEffect(() => {
    if (!characters) return;
    const timeUntilExpiration = () => {
      const now = new Date().getTime();
      return Math.min(
        ...Object.values(characters).map(
          (character) =>
            new Date(character.accessTokenExpirationDate).getTime() - now,
        ),
      );
    };
    console.log("time until expiration", timeUntilExpiration());
    const timer = setTimeout(
      () => {
        console.log(
          `updating session: token expires in ${
            timeUntilExpiration() / 1000
          } seconds`,
        );
        //void update();
        const now = new Date().getTime();
        const candidateCharacters = Object.values(characters).filter(
          (character) =>
            new Date(character.accessTokenExpirationDate).getTime() - now <
            30000 + 10000 /* account for some clock drift */,
        );
        console.log("tokens to update", candidateCharacters);
        candidateCharacters.forEach((character) => {
          fetch("/api/auth2/refresh", {
            method: "POST",
            body: character.refreshToken,
          })
            .then((res) => res.json())
            .then((res) => {
              const responseSchema = z.object({
                accessToken: z.string(),
                refreshTokenData: z.string(),
              });
              const {accessToken, refreshTokenData} =
                responseSchema.parse(res);
              addCharacter({
                accessToken,
                refreshToken: refreshTokenData,
              });
            });
        });
      },
      Math.max(timeUntilExpiration() - 30000, 1000),
    );
    return () => clearTimeout(timer);
  }, [characters]);

  // TODO: another useEffect for when a token does expire, blocking it from being used to send requests to ESI!!!

  return children;
};

export default function App({
                              Component,
                              pageProps: {session, ...pageProps},
                            }: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page: ReactNode) => page);
  const requiredScopes = Component.requiredScopes;

  const [queryClient, setQueryClient] = React.useState(() => new QueryClient());

  // This hook only run once in browser after the component is rendered for the first time.
  // It has same effect as the old componentDidMount lifecycle callback.
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      //const wb = window.workbox;
      const wb = new Workbox("/sw.js");

      wb.addEventListener("waiting", () => {
        showNotification({
          title: "Update Available",
          message:
            "A newer version of Jita is available. Simply reload to update.",
        });
        /*
        // `event.wasWaitingBeforeRegister` will be false if this is the first time the updated service worker is waiting.
        // When `event.wasWaitingBeforeRegister` is true, a previously updated service worker is still waiting.
        // You may want to customize the UI prompt accordingly.
        // https://developer.chrome.com/docs/workbox/handling-service-worker-updates/#the-code-to-put-in-your-page
        if (
          confirm(
            "A newer version of this web app is available, reload to update?",
          )
        ) {
          wb.addEventListener("controlling", () => {
            window.location.reload();
          });

          // Send a message to the waiting service worker, instructing it to activate.
          wb.messageSkipWaiting();
        } else {
          console.log(
            "User rejected to update SW, keeping the old version. New version will be automatically loaded when the app is opened next time.",
          );
        }*/
      });

      // never forget to call register as automatic registration is turned off in next.config.js
      void wb.register();
    }
  }, []);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Progressive Web App (next-pwa) */}
        <link rel="manifest" href="/manifest.json"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <link rel="shortcut icon" href="/favicon.ico"/>
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#9bb4d0"/>
        <meta name="theme-color" content="#9bb4d0"/>
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/manifest.json"/>
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

      <Script
        strategy="afterInteractive"
        async
        defer
        // /analytics is a proxy to the umami server - set in next.config.mjs
        src={"/analytics/script.js"}
        data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
        //data-do-not-track="true"
        data-domains="www.jita.space"
      ></Script>

      <Analytics/>

      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false}/>

        <SessionProvider session={session}>
          <EsiClientSSOAccessTokenInjector>
            <EveIconsContextProvider /*iconVersion="rhea"*/>
              <MantineProvider defaultColorScheme="dark" theme={themes.default}>
                <Notifications/>
                <RouterTransition/>
                <JitaSpotlightProvider>
                  <ModalsProvider
                    modals={contextModals}
                    modalProps={{centered: true}}
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
