import React from "react";
import { Container, JsonInput, Stack } from "@mantine/core";
import { signIn, useSession } from "next-auth/react";
import useSWR from "swr";

import { LoginWithEveOnlineButton } from "~/components/Button";
import { NAVBAR_WIDTH } from "~/layout/MailNavbarLayout/MailNavbarLayoutNavbar";

export default function Page() {
  const { data: session, status } = useSession();
  const fetcher = (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${session?.accessToken}`,
      },
    }).then((res) => res.json());
  const { data, error, isLoading } = useSWR(
    session ? "/api/fit" : null,
    fetcher,
    {},
  );

  return (
    <Container size="lg" py="xl">
      <Stack spacing="xl">
        {status === "authenticated" && (
          <JsonInput
            label="Session"
            value={JSON.stringify(session, null, 2)}
            autosize
          />
        )}
        {status === "unauthenticated" && (
          <LoginWithEveOnlineButton
            width={NAVBAR_WIDTH - 16}
            onClick={() => {
              void signIn("eveonline");
            }}
          />
        )}
        <JsonInput label="Fit (EFT format)" value={data?.eft} autosize />
        <JsonInput
          label="Data"
          value={JSON.stringify(data, null, 2)}
          autosize
        />
      </Stack>
    </Container>
  );
}
