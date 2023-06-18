import React, { type ReactElement } from "react";
import { Container, JsonInput, Stack, Text } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useEsiClientContext } from "@jitaspace/esi-client";

import { MainLayout } from "~/layouts";

export default function Page() {
  const { data: session } = useSession();
  const esiClientContext = useEsiClientContext();

  return (
    <Container size="lg">
      <Stack>
        <Text>Hello world</Text>
        <JsonInput
          label="Session Data"
          value={JSON.stringify(session, null, 2)}
          autosize
          readOnly
          maxRows={50}
        />
        <JsonInput
          label="ESI Client Context"
          value={JSON.stringify(esiClientContext, null, 2)}
          autosize
          readOnly
          maxRows={50}
        />
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
