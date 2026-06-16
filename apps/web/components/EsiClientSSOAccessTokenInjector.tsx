"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";

import { useAuthStore } from "@jitaspace/hooks";

import { refreshCharacterToken } from "./EsiClientSSOAccessTokenInjector.actions";

type AddCharacter = (params: {
  accessToken: string;
  refreshToken: string;
}) => Promise<void>;

// Extracted to module scope so the effect below stays within the
// max-nesting limit and the refresh/store/error flow reads top-to-bottom.
async function refreshCharacterAndStore(
  refreshToken: string,
  addCharacter: AddCharacter,
) {
  try {
    const { accessToken, refreshTokenData } =
      await refreshCharacterToken(refreshToken);
    await addCharacter({ accessToken, refreshToken: refreshTokenData });
  } catch (error) {
    console.error(error);
  }
}

export const EsiClientSSOAccessTokenInjector = ({
  children,
}: PropsWithChildren) => {
  const { addCharacter, characters } = useAuthStore();

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
                character.refreshToken,
                addCharacter,
              ),
          );
      },
      Math.max(timeUntilExpiration() - 30000, 1000),
    );
    return () => clearTimeout(timer);
  }, [addCharacter, characters]);

  // TODO: another useEffect for when a token does expire, blocking it from being used to send requests to ESI!!!

  return children;
};
