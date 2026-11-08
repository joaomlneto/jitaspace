"use client";

import type { ReactNode } from "react";
import { Button, Group, Menu, Text } from "@mantine/core";

import type { ESIScope } from "@jitaspace/esi-metadata";
import type { CharacterWithoutScopes } from "@jitaspace/hooks";
import { useSelectedCharacter } from "@jitaspace/hooks";

import { loginWithEveOnline } from "~/lib/eveOnlineLogin";

/**
 * The characters a page leaves out, and a way to share from each: sign in
 * again as it, asking for what it already granted plus `scopes`. One short
 * button whatever their number or the length of their names, and the text
 * truncates, so the line stays one line. EVE SSO signs in whichever character
 * is picked on its page, so the menu says which one to pick.
 */
function MissingCharactersNotice({
  missing,
  text,
  scopes,
}: Readonly<{
  missing: readonly CharacterWithoutScopes[];
  text: string;
  scopes: readonly ESIScope[];
}>) {
  return (
    <>
      {/* Takes whatever room is left on the line, down to none. */}
      <Text size="sm" truncate="end" title={text} style={{ flex: "1 1 0" }}>
        {text}
      </Text>
      <Menu position="bottom-start">
        <Menu.Target>
          <Button size="compact-sm" variant="light" style={{ flexShrink: 0 }}>
            Sign in…
          </Button>
        </Menu.Target>
        {/* Repeats the text, which a narrow screen may truncate away. */}
        <Menu.Dropdown maw={320}>
          <Menu.Label>{text}</Menu.Label>
          {missing.map((character) => (
            <Menu.Item
              key={character.characterId}
              onClick={() => {
                loginWithEveOnline([...character.grantedScopes, ...scopes]);
              }}
            >
              Sign in as {character.name}
              {character.sessionExpired ? " again" : ""}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </>
  );
}

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
   * "not shared" rather than as a bug, with a menu to sign in as each.
   */
  missing?: readonly CharacterWithoutScopes[];
  /**
   * The sentence naming the `missing` characters, given their names joined
   * with commas, e.g. `(names) => \`Planets not shared by ${names}.\``.
   */
  missingText?: (names: string) => string;
  /** Shown after the text, e.g. filters, once there is access. */
  children?: ReactNode;
}>) {
  const selectedCharacter = useSelectedCharacter();
  const granted = selectedCharacter?.accessTokenPayload.scp ?? [];
  const missingNotice =
    missing.length > 0 && missingText ? (
      <MissingCharactersNotice
        missing={missing}
        text={missingText(
          missing.map((character) => character.name).join(", "),
        )}
        scopes={scopes}
      />
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
        {/* Truncates only once the notice has none of the line left. */}
        <Text size="sm" c="dimmed" truncate={missingNotice ? "end" : undefined}>
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
    // With the notice the line must not wrap: it appears only after hydration,
    // so a second line would push the page down.
    <Group
      gap="sm"
      mih={30}
      wrap={missingNotice ? "nowrap" : "wrap"}
      aria-live="polite"
    >
      {content}
    </Group>
  );
}
