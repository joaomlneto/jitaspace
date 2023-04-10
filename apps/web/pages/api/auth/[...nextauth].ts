import NextAuth, {type Session} from "next-auth";
import {type JWT} from "next-auth/jwt";
import EVEOnlineProvider, {type EVEOnlineProfile} from "next-auth/providers/eveonline";
import {env} from "~/env.mjs";

export default NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    EVEOnlineProvider({
      clientId: env.EVE_CLIENT_ID,
      clientSecret: env.EVE_CLIENT_SECRET,
      authorization: {
        url: "https://login.eveonline.com/v2/oauth/authorize",
        params: {
          scope: [
            "esi-mail.organize_mail.v1",
            "esi-mail.read_mail.v1",
            "esi-mail.send_mail.v1",
            "esi-search.search_structures.v1",
            "esi-characters.read_contacts.v1",
          ].join(" "),
        },
      },
      profile(profile : EVEOnlineProfile) {
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
    /*async*/ session({
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
        return {
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at! * 1000,
          refreshToken: account.refresh_token,
          ...token,
        };
      }

      //console.log('token ttl', (<number>token.accessTokenExpires - Date.now()) / 1000);

      // return previous token if the access token has not expired yet
      if (Date.now() < <number>token.accessTokenExpires) {
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
          throw new Error("error refreshing access token")
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const refreshedTokens : {access_token: string, expires_in: number, refresh_token: string} = await refreshedTokensResponse.json();

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
});
