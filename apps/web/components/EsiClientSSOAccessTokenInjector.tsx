"use client";

import type { PropsWithChildren} from "react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import z from "zod";

import { useAuthStore } from "@jitaspace/hooks";

export const EsiClientSSOAccessTokenInjector = ({
  children,
}: PropsWithChildren) => {
  const { data: session, status: _status, update: _update } = useSession();
  const { addCharacter, characters } = useAuthStore();

  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  // This useEffect is here to import the current next-auth token (if available)
  useEffect(() => {
    if (session) {
      console.log({ session });
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
              const { accessToken, refreshTokenData } =
                responseSchema.parse(res);
              addCharacter({
                accessToken,
                refreshToken: refreshTokenData,
              });
            })
            .catch((err) => console.error(err));
        });
      },
      Math.max(timeUntilExpiration() - 30000, 1000),
    );
    return () => clearTimeout(timer);
  }, [characters]);

  // TODO: another useEffect for when a token does expire, blocking it from being used to send requests to ESI!!!

  return children;
};
