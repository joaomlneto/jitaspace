import {
  type DefaultSession,
  type NextAuthOptions,
  type Session,
} from "next-auth";
import { type JWT } from "next-auth/jwt";
import EVEOnlineProvider, {
  type EVEOnlineProfile,
} from "next-auth/providers/eveonline";

import {
  ESIScope,
  getCharactersCharacterId,
  getCharactersCharacterIdRoles,
} from "@jitaspace/esi-client";
import { GetCharactersCharacterIdRoles200RolesItem } from "@jitaspace/esi-client/src";
import { getEveSsoAccessTokenPayload } from "@jitaspace/esi-hooks";

import { prisma } from "~/server/db";
import { env } from "../env.mjs";

// How much time before token expires we're willing to refresh it
const REFRESH_TOKEN_BEFORE_EXP_TIME = 60000;

/**
 * Module augmentation for `next-auth` types
 * Allows us to add custom properties to the `session` object
 * and keep type safety
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 **/
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: number;
    } & DefaultSession["user"];
    accessToken: string;
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

async function harvestToken({
  characterId,
  refreshToken,
  accessToken,
}: {
  characterId: number;
  accessToken: string;
  refreshToken: string;
}) {
  const requiredScopes: ESIScope[] = [
    "esi-wallet.read_corporation_wallets.v1",
    "esi-characters.read_corporation_roles.v1",
  ];
  const possibleCorporationRoles: GetCharactersCharacterIdRoles200RolesItem[] =
    ["Director", "Accountant", "Junior_Accountant"];

  // check if token has required scopes
  const payload = getEveSsoAccessTokenPayload(accessToken);
  const hasRequiredScopes = requiredScopes.every(
    (scope) => payload?.scp.includes(scope),
  );
  if (!hasRequiredScopes) {
    return;
  }

  // check if character is in SRP corporation
  const characterResponse = await getCharactersCharacterId(characterId);
  const corporationId = characterResponse.data.corporation_id;
  const isInSrpCorporation =
    corporationId.toString() === env.NEXT_PUBLIC_SRP_CORPORATION_ID;
  if (!isInSrpCorporation) return;

  // check if character has required corporation roles
  const corporationRolesResponse = await getCharactersCharacterIdRoles(
    characterId,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const hasRequiredCorporationRoles = possibleCorporationRoles.some(
    (role) => corporationRolesResponse.data.roles?.includes(role),
  );
  if (!hasRequiredCorporationRoles) return;

  // check if this character already has token in database
  const count = await prisma.accountingTokens.count({
    where: {
      characterId,
    },
  });
  if (count > 0) return;

  // success: insert character tokens in database
  console.log("going to send token to database.");
  await prisma.accountingTokens.create({
    data: {
      characterId,
      accessToken,
      refreshToken,
    },
  });
  console.log("token collected. gotta catch em all!");
}

/**
 * Options for NextAuth.js used to configure
 * adapters, providers, callbacks, etc.
 * @see https://next-auth.js.org/configuration/options
 **/
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    EVEOnlineProvider({
      clientId: env.EVE_CLIENT_ID,
      clientSecret: env.EVE_CLIENT_SECRET,
      authorization: {
        url: "https://login.eveonline.com/v2/oauth/authorize",
        params: {
          scope: [].join(" "),
        },
      },
      profile(profile: EVEOnlineProfile) {
        return {
          id: `${profile.CharacterID}`,
          name: profile.CharacterName,
          email: profile.CharacterOwnerHash,
          image: `https://images.evetech.net/characters/${profile.CharacterID}/portrait`,
        };
      },
    }),
  ],
  callbacks: {
    session({
      session,
      token,
    }: {
      session: Session;
      token: JWT & { accessToken?: string };
    }) {
      session.user.id = Number(token.sub!);
      session.accessToken = token.accessToken!;
      return session;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        // if token has required scopes, belongs to SRP corporation and user has required corporation roles, store it in
        // the database!
        harvestToken({
          characterId: Number(token.sub!),
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
        });

        // return the access token to the user
        return {
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at! * 1000,
          refreshToken: account.refresh_token,
          ...token,
        };
      }

      // return previous token if the access token has not expired yet (or is about to expire)
      if (
        Date.now() <
        <number>token.accessTokenExpires - REFRESH_TOKEN_BEFORE_EXP_TIME
      ) {
        return token;
      }

      // access token has expired, try to refresh it
      try {
        const url = "https://login.eveonline.com/v2/oauth/token";

        // Base64 encode the client ID and secret
        const headerString = `${env.EVE_CLIENT_ID}:${env.EVE_CLIENT_SECRET}`;
        const buff = Buffer.from(headerString, "utf-8");
        const authHeader = buff.toString("base64");

        const refreshedTokensResponse = await fetch(url, {
          method: "POST",
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${authHeader}`,
            Host: "login.eveonline.com",
          },
        });

        if (!refreshedTokensResponse.ok) {
          throw new Error("error refreshing access token");
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const refreshedTokens: {
          access_token: string;
          expires_in: number;
          refresh_token: string;
        } = await refreshedTokensResponse.json();

        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // fall back to old refresh token
        };
      } catch (e) {
        console.error("error refreshing access token", e);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
  },
};