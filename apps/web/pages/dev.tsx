import React, { type ReactElement } from "react";
import { Container, JsonInput, Stack } from "@mantine/core";
import { useSession } from "next-auth/react";

import { EsiClientStateCard } from "~/components/EsiClient";
import { MainLayout } from "~/layouts";

export default function Page() {
  const { data: session } = useSession();

  return (
    <Container size="lg">
      <Stack>
        <EsiClientStateCard />
        <JsonInput
          label="Session Data"
          value={JSON.stringify(session, null, 2)}
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
