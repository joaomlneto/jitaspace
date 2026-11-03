"use client";

import type { ReactNode } from "react";
import { Button, Group, Text } from "@mantine/core";

import type { ESIScope } from "@jitaspace/esi-metadata";
import type { CharacterWithoutScopes } from "@jitaspace/hooks";
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
/**
 * Sign in again as one character, asking for what it already granted plus
 * `scopes`. EVE SSO signs in whichever character is picked on its page, so
 * the button says which one to pick.
 */
function SignInAsButton({
  character,
  scopes,
}: Readonly<{
  character: CharacterWithoutScopes;
  scopes: readonly ESIScope[];
}>) {
  return (
    <Button
      size="compact-sm"
      variant="light"
      onClick={() => {
        loginWithEveOnline([...character.grantedScopes, ...scopes]);
      }}
    >
      Sign in as {character.name}
      {character.sessionExpired ? " again" : ""}
    </Button>
  );
}

export function AccessStatusLine({
  isPending,
  hasAccess,
  scopes,
  signedOut,
  summary,
  missing = [],
  missingText,
  children,
}: Readonly<{
  isPending: boolean;
  hasAccess: boolean;
  /** Asked for on top of the scopes already granted. */
  scopes: readonly ESIScope[];
  signedOut: string;
  summary: string;
  /**
   * Logged-in characters the page leaves out because they have not granted
   * `scopes` (or their session ended). Named, so a missing character reads as
   * "not shared" rather than as a bug, each with a button to fix it.
   */
  missing?: readonly CharacterWithoutScopes[];
  /** Says what the `missing` characters have not shared, e.g. "planets". */
  missingText?: (names: string) => string;
  /** Shown after the text, e.g. filters, once there is access. */
  children?: ReactNode;
}>) {
  const selectedCharacter = useSelectedCharacter();
  const granted = selectedCharacter?.accessTokenPayload.scp ?? [];
  const missingNotice =
    missing.length > 0 && missingText ? (
      <>
        <Text size="sm">
          {missingText(missing.map((character) => character.name).join(", "))}
        </Text>
        {missing.map((character) => (
          <SignInAsButton
            key={character.characterId}
            character={character}
            scopes={scopes}
          />
        ))}
      </>
    ) : null;
  let content: ReactNode;
  if (isPending) {
    content = (
      <Text size="sm" c="dimmed">
        Loading your characters…
      </Text>
    );
  } else if (hasAccess) {
    content = (
      <>
        <Text size="sm" c="dimmed">
          {summary}
        </Text>
        {children}
        {missingNotice}
      </>
    );
  } else if (missingNotice) {
    // Signed in, but no character has shared what the page needs: say which,
    // rather than a generic sign-in prompt.
    content = missingNotice;
  } else {
    content = (
      <>
        <Text size="sm">{signedOut}</Text>
        <Button
          size="compact-sm"
          onClick={() => {
            loginWithEveOnline([...new Set([...granted, ...scopes])]);
          }}
        >
          Sign in with EVE Online
        </Button>
      </>
    );
  }
  return (
    <Group gap="sm" mih={30} aria-live="polite">
      {content}
    </Group>
  );
}
