import React, { type ReactElement } from "react";
import { GetServerSideProps } from "next";
import { Container, JsonInput } from "@mantine/core";

import { useGetCorporationsCorporationId } from "@jitaspace/esi-client";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";

import { EveHtmlRenderer } from "~/components/EveHtmlRenderer";
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
  const xxx = useGetCorporationsCorporationId(
    parseInt(env.NEXT_PUBLIC_SRP_CORPORATION_ID),
  );
  const { data: corporation } = xxx;
  return (
    <Container size="md">
      {corporation?.data && (
        <EveHtmlRenderer
          content={
            corporation?.data.description
              ? sanitizeFormattedEveString(corporation?.data.description)
              : "No description"
          }
        />
      )}
      <JsonInput
        label="Server Configuration"
        value={JSON.stringify(serverEnv, null, 2)}
        autosize
      />
      <JsonInput
        label="Client Configuration"
        value={JSON.stringify(
          {
            NEXT_PUBLIC_SRP_CORPORATION_ID: env.NEXT_PUBLIC_SRP_CORPORATION_ID,
          },
          null,
          2,
        )}
        autosize
      />
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
