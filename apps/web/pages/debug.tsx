import type { ReactElement } from "react";
import React from "react";
import { GetStaticProps } from "next";
import { Container, Group, Stack, Text, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { FolderIcon } from "@jitaspace/eve-icons";

import { MainLayout } from "~/layouts";

type PageProps = {
  vars: Record<string, any>;
};

export const getStaticProps: GetStaticProps<PageProps> = async () => {
  return {
    props: {
      vars: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        DATABASE_URL: process.env.DATABASE_URL,
        EVE_CLIENT_ID: process.env.EVE_CLIENT_ID,
        EVE_CLIENT_SECRET: process.env.EVE_CLIENT_SECRET,
        INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
        CRON_SECRET: process.env.CRON_SECRET,
        SKIP_BUILD_STATIC_GENERATION: process.env.SKIP_BUILD_STATIC_GENERATION,
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
        NEXT_PUBLIC_GOOGLE_TAG_ID: process.env.NEXT_PUBLIC_GOOGLE_TAG_ID,
        NEXT_PUBLIC_DISCORD_INVITE_LINK:
          process.env.NEXT_PUBLIC_DISCORD_INVITE_LINK,
      },
    },
    notFound: process.env.NODE_ENV === "production",
  };
};

export default function Page({ vars }: Readonly<PageProps>) {
  return (
    <Container size="md">
      <Stack>
        <Group>
          <FolderIcon width={48} />
          <Title>Environment Variables</Title>
        </Group>
        {Object.entries(vars).map(([key, value]) => (
          <Group key={key} justify="space-between" wrap="nowrap" gap="xl">
            <div>
              <Text size="xs">{key}</Text>
            </div>
            <div>
              <Text size="xs">{value}</Text>
            </div>
          </Group>
        ))}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return (
    <MainLayout>
      <NextSeo title="Development" />
      {page}
    </MainLayout>
  );
};
