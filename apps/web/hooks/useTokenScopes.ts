import { useSession } from "next-auth/react";

import { type ESIScope } from "@jitaspace/esi-client";

export function useTokenScopes(): {
  loading: boolean;
  error?: string;
  grantedScopes?: ESIScope[];
} {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return {
      loading: true,
      grantedScopes: [],
    };
  }

  if (status !== "authenticated")
    return {
      loading: false,
      error: status,
      grantedScopes: [],
    };

  const tokenPayload = session.accessToken.split(".")[1];

  if (!tokenPayload) {
    return {
      loading: false,
      error: "token payload missing",
      grantedScopes: [],
    };
  }

  const decodedPayload = JSON.parse(
    Buffer.from(tokenPayload, "base64").toString(),
  ) as { scp: ESIScope[] };

  return {
    loading: false,
    grantedScopes: decodedPayload.scp,
  };
}
