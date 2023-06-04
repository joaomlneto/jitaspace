import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import { Container } from "@mantine/core";

import { MessagePanel } from "~/components/MessagePanel";
import { MailLayout } from "~/layout";

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
  return <MailLayout>{page}</MailLayout>;
};
