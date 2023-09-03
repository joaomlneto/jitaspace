import React, { type ReactElement } from "react";
import { Stack } from "@mantine/core";

import { MainLayout } from "~/layouts";

export default function Page() {
  return <Stack>HELLO ADMIN!</Stack>;
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
