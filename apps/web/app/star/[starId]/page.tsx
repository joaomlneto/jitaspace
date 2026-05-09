import { Suspense } from "react";
import { Loader } from "@mantine/core";
import PageClient from "./page.client";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <PageClient />
    </Suspense>
  );
}
