import type { EVEOnlineProfile } from "next-auth/providers/eveonline";
import {
  type DefaultSession,
  type NextAuthOptions,
  type Session,
} from "next-auth";
import { type JWT } from "next-auth/jwt";
import EVEOnlineProvider from "next-auth/providers/eveonline";

import { getEveSsoAccessTokenPayload } from "@jitaspace/auth-utils";

import { env } from "../env.mjs";
import { sealDataWithAuthSecret } from "../utils";


// How much time before token expires we're willing to refresh it
const REFRESH_TOKEN_BEFORE_EXP_TIME = 60000;

const encryptRefreshToken = async (
  accessToken: string,
  refreshToken: string,
) => {
  const payload = getEveSsoAccessTokenPayload(accessToken);
  if (!payload) throw new Error("Error getting access token payload");
  if (!refreshToken) throw new Error("No refresh token provided!");
  return await sealDataWithAuthSecret({
    accessTokenExpiration: payload.exp,
    refreshToken,
  });
};

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
    encryptedRefreshToken: string;
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure
 * adapters, providers, callbacks, etc.
 * @see https://next-auth.js.org/configuration/options
 **/
export const authOptions = {
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
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT & { accessToken?: string; refreshToken?: string };
    }) {
      session.user.id = Number(token.sub!);
      session.accessToken = token.accessToken!;
      console.log({ token });
      // @ts-expect-error token does not have this property and im not sure where to add it
      session.encryptedRefreshToken = token.encryptedRefreshToken;
      return session;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at! * 1000,
          encryptedRefreshToken: await encryptRefreshToken(
            account.access_token!,
            account.refresh_token!,
          ),
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
      throw new Error("next-auth refresh code is to be removed!");
      /*
      try {
        const refreshedTokens = await refreshEveSsoToken({
          eveClientId: env.EVE_CLIENT_ID,
          eveClientSecret: env.EVE_CLIENT_SECRET,
          refreshToken: token.refreshToken as string,
        });

        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // fall back to old refresh token
          encryptedRefreshToken: await encryptRefreshToken(
            refreshedTokens.access_token,
            refreshedTokens.refresh_token ?? token.refreshToken,
          ),
        };
      } catch (e) {
        console.error("error refreshing access token", e);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
       */
    },
  },
} satisfies NextAuthOptions;
