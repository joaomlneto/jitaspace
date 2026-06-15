import { Suspense } from "react";
import { Loader } from "@mantine/core";

import HistoryIndexClient from "./page.client";

export const metadata = {
  title: "Type Change History",
  description:
    "Browse how EVE Online item types have changed across client builds over time.",
};

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <HistoryIndexClient />
    </Suspense>
  );
}
