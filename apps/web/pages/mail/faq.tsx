import React, { type ReactElement } from "react";
import {
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { signIn, useSession } from "next-auth/react";
import { NextSeo } from "next-seo";

import { CharacterAvatar } from "@jitaspace/ui";

import { LoginWithEveOnlineButton } from "~/components/Button";
import { EveMailFaqAccordion } from "~/components/EveMail";
import { MailLayout } from "~/layout";

export default function Page() {
  const { data: session, status } = useSession();

  return (
    <>
      <NextSeo title="EveMail" />
      <Container p="xl">
        <Stack spacing="xl">
          <Title order={1}>EveMail</Title>
          {status === "loading" && (
            <Center>
              <Group>
                <Loader />
                <Text>Loading your session...</Text>
              </Group>
            </Center>
          )}
          {status === "unauthenticated" && (
            <Center>
              <LoginWithEveOnlineButton
                className="umami--click--login-button"
                onClick={() => void signIn("eveonline", { callbackUrl: "/" })}
              />
            </Center>
          )}
          {status === "authenticated" && (
            <Center>
              <Group>
                <CharacterAvatar characterId={session?.user.id} radius="xl" />
                <Text>Welcome back, {session?.user.name}!</Text>
              </Group>
            </Center>
          )}
          <Stack>
            <Title order={3}>Frequently Asked Questions</Title>
            <EveMailFaqAccordion />
          </Stack>
        </Stack>
      </Container>
    </>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
