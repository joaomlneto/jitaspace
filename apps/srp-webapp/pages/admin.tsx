import React, { type ReactElement } from "react";
import { GetServerSideProps } from "next";
import { Container } from "@mantine/core";
import { getServerSession } from "next-auth";

import { AdminCorporationJournalEntriesTable } from "~/components/Table";
import { authOptions } from "~/config/auth";
import { MainLayout } from "~/layouts";
import { isTokenAdmin } from "~/utils/isAdmin";

export const getServerSideProps: GetServerSideProps<{}> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  const isAdmin =
    session != null &&
    (await isTokenAdmin({
      characterId: session.user.id,
      accessToken: session.accessToken,
    }));

  if (!isAdmin) {
    return { notFound: true };
  }
  return { props: {} };
};

export default function Page() {
  return (
    <Container>
      <AdminCorporationJournalEntriesTable />
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
