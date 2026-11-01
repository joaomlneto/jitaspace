"use client";

import type { ReactNode } from "react";
import { Button, Group, Text } from "@mantine/core";

import type { ESIScope } from "@jitaspace/esi-metadata";
import { useSelectedCharacter } from "@jitaspace/hooks";

import { loginWithEveOnline } from "~/lib/eveOnlineLogin";

/**
 * One line under a PI page's title saying whose data it shows, or how to get
 * some: loading, a sign-in prompt, or a summary.
 *
 * Always one line of the same height. The prerendered page cannot know who is
 * signed in, so anything that appeared above the content only after hydration
 * (an alert, say) would push the whole page down as it loads.
 */
export function AccessStatusLine({
  isPending,
  hasAccess,
  scope,
  signedOut,
  summary,
  children,
}: Readonly<{
  isPending: boolean;
  hasAccess: boolean;
  /** Asked for on top of the scopes already granted. */
  scope: ESIScope;
  signedOut: string;
  summary: string;
  /** Shown after the text, e.g. filters, once there is access. */
  children?: ReactNode;
}>) {
  const selectedCharacter = useSelectedCharacter();
  const granted = selectedCharacter?.accessTokenPayload.scp ?? [];
  return (
    <Group gap="sm" mih={30} aria-live="polite">
      {isPending ? (
        <Text size="sm" c="dimmed">
          Loading your characters…
        </Text>
      ) : hasAccess ? (
        <>
          <Text size="sm" c="dimmed">
            {summary}
          </Text>
          {children}
        </>
      ) : (
        <>
          <Text size="sm">{signedOut}</Text>
          <Button
            size="compact-sm"
            onClick={() => {
              loginWithEveOnline([...new Set([...granted, scope])]);
            }}
          >
            Sign in with EVE Online
          </Button>
        </>
      )}
    </Group>
  );
}
