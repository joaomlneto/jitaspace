"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Center, Loader, Stack, Text } from "@mantine/core";

import { useAuthStore } from "@jitaspace/hooks";

import { consumeLoginResult } from "./actions";

function safeReturnTo(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

/**
 * Terminal page of the OAuth flow: drains the single-use result cookie via a
 * server action and adds the authenticated character to the client-side store,
 * then redirects to the originally-requested page.
 */
export default function LoginCompletePage() {
  const router = useRouter();
  const hasRun = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Guard against React StrictMode's double-invoke in development.
    if (hasRun.current) return;
    hasRun.current = true;

    const returnTo = safeReturnTo(
      new URLSearchParams(window.location.search).get("returnTo"),
    );

    void (async () => {
      try {
        const result = await consumeLoginResult();
        if (result) {
          // Rehydrate BEFORE adding so we merge into — rather than clobber —
          // any characters already persisted in localStorage.
          await useAuthStore.persist.rehydrate();
          await useAuthStore.getState().addCharacter({
            accessToken: result.accessToken,
            refreshToken: result.encryptedRefreshToken,
          });
        }
        router.replace(returnTo);
      } catch {
        setFailed(true);
      }
    })();
  }, [router]);

  return (
    <Center mih="60vh">
      <Stack align="center" gap="sm">
        {failed ? (
          <Text c="red">
            Something went wrong while signing you in. Please try again.
          </Text>
        ) : (
          <>
            <Loader />
            <Text c="dimmed">Completing sign in…</Text>
          </>
        )}
      </Stack>
    </Center>
  );
}
