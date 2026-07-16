"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useRef } from "react";

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
        // Transient failure (network blip / EVE SSO 5xx). Leave the session
        // untouched — the refresh effect re-arms a bounded retry so the token
        // is refreshed on a later tick instead of staying expired until reload.
        console.error(outcome.message);
        break;
    }
  } catch (error) {
    console.error(error);
  }
}

// Refresh-cadence tuning (all milliseconds).
const REFRESH_LEAD_MS = 30_000; // aim to refresh this long before expiry
const REFRESH_WINDOW_MS = 40_000; // lead + allowance for clock drift
const MIN_DELAY_MS = 1_000; // never schedule the next check sooner than this
const RETRY_DELAY_MS = 30_000; // bounded backoff after any refresh attempt
const IDLE_DELAY_MS = 5 * 60_000; // nothing refreshable: just re-check later

export const EsiClientSSOAccessTokenInjector = ({
  children,
}: PropsWithChildren) => {
  const { addCharacter, markCharacterSessionExpired, characters } =
    useAuthStore();

  // Character IDs with a refresh currently in flight. A refresh's store write
  // is gated on an ESI affiliation fetch, so its round-trip can outlive the
  // retry backoff below; excluding in-flight characters from the "due" set
  // keeps the self-rescheduling tick from double-firing a refresh (a duplicate
  // would present the already-rotated refresh token and waste a request). Held
  // in a ref so it survives this effect's re-runs.
  const inFlightRefreshes = useRef<Set<number>>(new Set());

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  // Refreshes tokens that expired or are close to expiring. The check
  // re-schedules itself on every tick so a transient "error" outcome — which
  // mutates no state, so this effect would not otherwise re-run — is still
  // retried, instead of the token silently staying expired until a page reload.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    // Sessions flagged `sessionExpired` are excluded everywhere: EVE will not
    // renew them, so retrying is pointless AND their permanently-negative
    // time-to-expiry would otherwise drag the whole cadence down to the 1s
    // floor forever (one doomed refresh per second per dead character).
    const refreshableCharacters = () =>
      Object.values(characters).filter(
        (character) => !character.sessionExpired,
      );

    // Delay until the soonest refreshable token needs attention. Returns a
    // large idle value (never `Infinity` from `Math.min(...[])`) when nothing
    // is refreshable, so the timer keeps a sane cadence.
    const delayUntilNextRefresh = () => {
      const now = Date.now();
      const leadTimes = refreshableCharacters().map(
        (character) =>
          new Date(character.accessTokenExpirationDate).getTime() -
          now -
          REFRESH_LEAD_MS,
      );
      if (leadTimes.length === 0) return IDLE_DELAY_MS;
      return Math.max(Math.min(...leadTimes), MIN_DELAY_MS);
    };

    const runTick = () => {
      if (cancelled) return;
      const now = Date.now();
      const inFlight = inFlightRefreshes.current;
      const due = refreshableCharacters().filter(
        (character) =>
          !inFlight.has(character.characterId) &&
          new Date(character.accessTokenExpirationDate).getTime() - now <
            REFRESH_WINDOW_MS,
      );
      due.forEach((character) => {
        inFlight.add(character.characterId);
        void refreshCharacterAndStore(
          character,
          addCharacter,
          markCharacterSessionExpired,
        ).finally(() => inFlight.delete(character.characterId));
      });
      // Re-arm. A successful refresh calls addCharacter, which changes the
      // store and re-runs this effect (cancelling this timer) at the normal
      // cadence. Floor the delay at RETRY_DELAY_MS whenever a refresh is in
      // flight (the ones just fired, or a slow earlier one still pending): it
      // keeps a persistently failing refresh from retrying every second and
      // avoids spinning while an in-flight refresh — excluded from `due` — is
      // still settling.
      const delay =
        inFlight.size > 0
          ? Math.max(delayUntilNextRefresh(), RETRY_DELAY_MS)
          : delayUntilNextRefresh();
      timer = setTimeout(runTick, delay);
    };

    timer = setTimeout(runTick, delayUntilNextRefresh());
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [addCharacter, markCharacterSessionExpired, characters]);

  // TODO: another useEffect for when a token does expire, blocking it from being used to send requests to ESI!!!

  return children;
};
