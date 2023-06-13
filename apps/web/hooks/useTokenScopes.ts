import { useSession } from "next-auth/react";

import { type ESIScope } from "@jitaspace/esi-client";

export function useTokenScopes(): {
  error?: string;
  grantedScopes?: ESIScope[];
} {
  const { data: session, status } = useSession();
  if (status !== "authenticated")
    return {
      error: status,
      grantedScopes: [],
    };

  const tokenPayload = session.accessToken.split(".")[1];

  if (!tokenPayload) {
    return {
      error: "token payload missing",
      grantedScopes: [],
    };
  }

  const decodedPayload = JSON.parse(
    Buffer.from(tokenPayload, "base64").toString(),
  ) as { scp: ESIScope[] };

  return {
    grantedScopes: decodedPayload.scp,
  };
}
