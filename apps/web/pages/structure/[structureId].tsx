import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Button,
  Container,
  Group,
  JsonInput,
  Stack,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import {
  useEsiClientContext,
  useGetUniverseStructuresStructureId,
} from "@jitaspace/esi-client";
import { StructureName } from "@jitaspace/ui";

import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const structureId = router.query.structureId as string;
  const { isTokenValid } = useEsiClientContext();
  const { data: structure, error } = useGetUniverseStructuresStructureId(
    parseInt(structureId),
    {},
    {
      swr: {
        enabled: isTokenValid,
      },
    },
  );

  return (
    <Container size="sm">
      <Stack>
        <JsonInput
          label="RAW EDITOR HTML"
          value={JSON.stringify({ structure, error }, null, 2)}
          autosize
          readOnly
          maxRows={50}
        />
        <Group spacing="xl">
          <Title order={3}>
            <StructureName span structureId={structureId} />
          </Title>
        </Group>
        <Group>
          <Link
            href={`https://evemaps.dotlan.net/structure/${structureId}`}
            target="_blank"
          >
            <Button>
              <Group spacing="xs">
                <IconExternalLink size={14} />
                DOTLAN EveMaps
              </Group>
            </Button>
          </Link>
        </Group>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
