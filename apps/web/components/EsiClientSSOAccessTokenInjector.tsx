"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";

import { useAuthStore } from "@jitaspace/hooks";

import { refreshCharacterToken } from "./EsiClientSSOAccessTokenInjector.actions";

type AddCharacter = (params: {
  accessToken: string;
  refreshToken: string;
}) => Promise<void>;
type MarkSessionExpired = (characterId: number) => void;

// Extracted to module scope so the effect below stays within the
// max-nesting limit and the refresh/store/error flow reads top-to-bottom.
async function refreshCharacterAndStore(
  character: { characterId: number; refreshToken: string },
  addCharacter: AddCharacter,
  markSessionExpired: MarkSessionExpired,
) {
  try {
    const outcome = await refreshCharacterToken(character.refreshToken);
    switch (outcome.status) {
      case "refreshed":
        await addCharacter({
          accessToken: outcome.accessToken,
          refreshToken: outcome.refreshTokenData,
        });
        break;
      case "requires-reauth":
        // EVE will not renew this refresh token (too old / revoked). Keep the
        // character but flag its session as expired so the UI can mark it and
        // prompt re-authentication, instead of silently re-attempting the
        // doomed refresh on every load.
        markSessionExpired(character.characterId);
        break;
      case "error":
        console.error(outcome.message);
        break;
    }
  } catch (error) {
    console.error(error);
  }
}

export const EsiClientSSOAccessTokenInjector = ({
  children,
}: PropsWithChildren) => {
  const { addCharacter, markCharacterSessionExpired, characters } =
    useAuthStore();

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  // this refreshes tokens that expired or are close to expiring
  useEffect(() => {
    const timeUntilExpiration = () => {
      const now = Date.now();
      return Math.min(
        ...Object.values(characters).map(
          (character) =>
            new Date(character.accessTokenExpirationDate).getTime() - now,
        ),
      );
    };
    const timer = setTimeout(
      () => {
        const now = Date.now();
        Object.values(characters)
          .filter(
            (character) =>
              new Date(character.accessTokenExpirationDate).getTime() - now <
              30000 + 10000 /* account for some clock drift */,
          )
          .forEach(
            (character) =>
              void refreshCharacterAndStore(
                character,
                addCharacter,
                markCharacterSessionExpired,
              ),
          );
      },
      Math.max(timeUntilExpiration() - 30000, 1000),
    );
    return () => clearTimeout(timer);
  }, [addCharacter, markCharacterSessionExpired, characters]);

  // TODO: another useEffect for when a token does expire, blocking it from being used to send requests to ESI!!!

  return children;
};
