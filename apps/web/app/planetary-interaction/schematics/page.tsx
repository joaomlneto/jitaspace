import { Container, Stack } from "@mantine/core";
import { NuqsAdapter } from "nuqs/adapters/react";

import {
  PiPageHeader,
  SchematicsBrowser,
} from "~/components/PlanetaryInteraction";
import { pageMetadata } from "~/lib/metadata";
import { readPiCatalog } from "../catalog";

export const metadata = pageMetadata({
  title: "Planetary Schematics",
  description:
    "Every EVE Online planetary industry schematic, from basic to advanced commodities: inputs, outputs, cycle times and what each product is used for.",
  path: "/planetary-interaction/schematics",
  badge: "Planetary Interaction",
});

export default async function Page() {
  const catalog = await readPiCatalog();
  return (
    <Container size="xl">
      <Stack>
        <PiPageHeader
          active="schematics"
          title="Planetary Schematics"
          description="What every processor can make, what it needs, and how fast — from raw resources to advanced commodities."
        />
        {/* The React adapter, so the search does not drop the page out of its static HTML. */}
        <NuqsAdapter>
          <SchematicsBrowser catalog={catalog} />
        </NuqsAdapter>
      </Stack>
    </Container>
  );
}
