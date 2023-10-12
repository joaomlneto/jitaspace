import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import { Container } from "@mantine/core";

import { MessagePanel } from "~/components/EveMail";
import { MainLayout } from "~/layouts";


export default function Page() {
  const router = useRouter();
  const messageId = router.query.messageId as string;
  return (
    <Container>
      <MessagePanel messageId={Number(messageId)} />
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
