import React, { type ReactElement } from "react";
import { GetServerSideProps } from "next";
import {
  Button,
  Center,
  Container,
  Spoiler,
  Stack,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { useSession } from "next-auth/react";

import { useGetCorporationsCorporationId } from "@jitaspace/esi-client";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";

import { EveHtmlRenderer } from "~/components/EveHtmlRenderer";
import {
  CharacterCorporationJournalEntriesTable,
  PublicCorporationJournalEntriesTable,
} from "~/components/Table";
import { CorporationWalletBalance } from "~/components/WalletBalance/CorporationWalletBalance";
import { env } from "~/env.mjs";
import { MainLayout } from "~/layouts";

type PageProps = {
  serverEnv: {
    NODE_ENV: string;
    CORPORATION_ID?: string;
    EVE_CLIENT_ID?: string;
  };
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  context,
) => {
  try {
    return {
      props: {
        serverEnv: {
          NODE_ENV: env.NODE_ENV,
          EVE_CLIENT_ID: env.EVE_CLIENT_ID,
        },
      },
    };
  } catch (e) {
    return {
      notFound: true,
    };
  }
};

export default function Page({ serverEnv }: PageProps) {
  const { data: corporation } = useGetCorporationsCorporationId(
    parseInt(env.NEXT_PUBLIC_SRP_CORPORATION_ID),
  );
  const { data: session, status: sessionStatus } = useSession();

  return (
    <Container size="xs">
      <Stack>
        <Center>
          <Button
            variant="outline"
            onClick={() =>
              modals.open({
                title: <Title order={3}>Terms and Conditions</Title>,
                size: "lg",
                children: (
                  <EveHtmlRenderer
                    content={
                      corporation?.data.description
                        ? sanitizeFormattedEveString(
                            corporation?.data.description,
                          )
                        : "No description"
                    }
                  />
                ),
              })
            }
          >
            Terms and conditions
          </Button>
        </Center>
        <Container size="md">
          <CorporationWalletBalance />
        </Container>
        {sessionStatus === "authenticated" && (
          <>
            <Title order={3}>My Payments</Title>
            <Spoiler
              maxHeight={330}
              showLabel="Show more"
              hideLabel="Show less"
            >
              <CharacterCorporationJournalEntriesTable />
            </Spoiler>
          </>
        )}
        <Title order={3}>Latest SRP Transactions</Title>
        <Spoiler maxHeight={330} showLabel="Show more" hideLabel="Show less">
          <PublicCorporationJournalEntriesTable />
        </Spoiler>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
