"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@mantine/core";
import { modals, openContextModal } from "@mantine/modals";

import type { CharacterSsoSession } from "@jitaspace/hooks";
import { useAuthStore, useSelectedCharacter } from "@jitaspace/hooks";

/**
 * The account actions behind the character menu: who is signed in, the other
 * characters to switch to, and settings / add character / log out. Shared by
 * the header's dropdown menu (UserButton) and the inline account section of the
 * mobile drawer, so both behave identically.
 */
export function useAccountActions() {
  const router = useRouter();
  const character = useSelectedCharacter();
  const { characters, selectCharacter, removeCharacter } = useAuthStore();

  const sortedCharacters = useMemo(
    () =>
      Object.values(characters).sort((a, b) =>
        a.accessTokenPayload.name.localeCompare(b.accessTokenPayload.name),
      ),
    [characters],
  );

  const otherCharacters = useMemo(
    () =>
      sortedCharacters.filter((c) => c.characterId !== character?.characterId),
    [sortedCharacters, character?.characterId],
  );

  // Re-authentication uses the same EVE SSO login flow as adding a character;
  // logging in again with an expired character refreshes its tokens and clears
  // the `sessionExpired` flag.
  const openLoginModal = useCallback(
    () =>
      openContextModal({
        modal: "login",
        title: "Login",
        size: "xl",
        innerProps: {},
      }),
    [],
  );

  const openSettingsModal = useCallback(
    () =>
      openContextModal({
        modal: "settings",
        title: "Settings",
        size: "xl",
        innerProps: {},
      }),
    [],
  );

  /** Switches to a character, or re-authenticates it if its session expired. */
  const switchToCharacter = useCallback(
    (target: CharacterSsoSession) =>
      target.sessionExpired
        ? openLoginModal()
        : selectCharacter(target.characterId),
    [openLoginModal, selectCharacter],
  );

  const confirmLogout = useCallback(() => {
    if (!character) return;
    const { characterId } = character;
    const characterName = character.accessTokenPayload.name;
    modals.openConfirmModal({
      title: `Log out ${characterName}?`,
      children: (
        <Text size="sm">
          Are you sure you want to log out from character {characterName}?
        </Text>
      ),
      labels: { confirm: "Confirm", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        removeCharacter(characterId);
        // If that was the last character we're fully logged out, so go home.
        // Otherwise removeCharacter() selects one of the remaining characters
        // and we stay on the current page.
        if (sortedCharacters.length <= 1) {
          router.push("/");
        }
      },
    });
  }, [character, removeCharacter, router, sortedCharacters.length]);

  return {
    character,
    otherCharacters,
    openLoginModal,
    openSettingsModal,
    switchToCharacter,
    confirmLogout,
  };
}
