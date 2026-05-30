"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";

import { useAuthStore } from "@jitaspace/hooks";

import { refreshCharacterToken } from "./EsiClientSSOAccessTokenInjector.actions";

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
      const now = new Date().getTime();
      return Math.min(
        ...Object.values(characters).map(
          (character) =>
            new Date(character.accessTokenExpirationDate).getTime() - now,
        ),
      );
    };
    const timer = setTimeout(
      () => {
        const now = new Date().getTime();
        const candidateCharacters = Object.values(characters).filter(
          (character) =>
            new Date(character.accessTokenExpirationDate).getTime() - now <
            30000 + 10000 /* account for some clock drift */,
        );
        candidateCharacters.forEach((character) => {
          void refreshCharacterToken(character.refreshToken)
            .then(({ accessToken, refreshTokenData }) =>
              addCharacter({
                accessToken,
                refreshToken: refreshTokenData,
              }),
            )
            .catch((err) => console.error(err));
        });
      },
      Math.max(timeUntilExpiration() - 30000, 1000),
    );
    return () => clearTimeout(timer);
  }, [addCharacter, characters]);

  // TODO: another useEffect for when a token does expire, blocking it from being used to send requests to ESI!!!

  return children;
};
