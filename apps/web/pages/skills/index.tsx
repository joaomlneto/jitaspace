import React, { type ReactElement } from "react";
import { Container } from "@mantine/core";

import { MainLayout } from "~/layout";

export default function Page() {
  return <Container>Success!</Container>;
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
