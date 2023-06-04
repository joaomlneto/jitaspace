import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  Button,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useSession } from "next-auth/react";
import { NextSeo } from "next-seo";
import useSWRInfinite from "swr/infinite";

import { type GetCharactersCharacterIdMail200Item } from "@jitaspace/esi-client";
import { toArrayIfNot } from "@jitaspace/utils";

import { MailLabelColorSwatch } from "~/components/ColorSwatch";
import { MailboxDataTable } from "~/components/MailboxTable";
import { LabelNameText } from "~/components/Text";
import { MailLayout } from "~/layout";

export default function Page() {
  const router = useRouter();
  const labels = router.query.labels;
  const { data: session } = useSession();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetCharactersCharacterIdMail200Item[]>(
      function getKey(
        pageIndex,
        previousPageData: GetCharactersCharacterIdMail200Item[],
      ) {
        if (!session?.user.id) {
          return null;
        }
        const params = new URLSearchParams();
        if (pageIndex > 0) {
          params.append(
            "last_mail_id",
            (previousPageData ?? [])
              .slice(0, 50 * pageIndex)
              .reduce((acc, msg) => Math.min(acc, msg.mail_id ?? acc), Infinity)
              .toString(),
          );
        }
        if (labels) {
          params.append("labels", labels.toString());
        }
        return `https://esi.evetech.net/latest/characters/${
          session?.user.id
        }/mail/?${params.toString()}`;
      },
      (url: string) =>
        fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }).then((r) => r.json()),
    );

  const mergedData = data?.flat() ?? [];

  const hasMore = mergedData.length === 50 * size;

  return (
    <>
      <NextSeo title="EveMail" />
      <Container size="xl">
        <Stack>
          {error && (
            <Container size="xs">
              {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
              <Alert title="Error loading messages">{error.message}</Alert>
            </Container>
          )}
          <Group>
            <Title order={1}>Mailbox</Title>
            {(isLoading || isValidating) && (
              <Group>
                <Loader size="xs" />
                {isLoading && <Text>Loading</Text>}
                {isValidating && <Text>Refreshing</Text>}
              </Group>
            )}
          </Group>
          {labels && (
            <Group>
              <Title order={4}>Labels:</Title>
              {toArrayIfNot(labels).flatMap((list) =>
                list.split(",").map((labelId) => (
                  <Group noWrap spacing="xs" key={labelId}>
                    <MailLabelColorSwatch labelId={labelId} size={16} />
                    <LabelNameText labelId={labelId} />
                  </Group>
                )),
              )}
            </Group>
          )}
          {data && (
            <MailboxDataTable data={mergedData} mutate={() => void mutate()} />
          )}
          {hasMore && (
            <Button
              w="100%"
              onClick={() => void setSize(size + 1)}
              disabled={isLoading || isValidating}
            >
              Load more messages
            </Button>
          )}
        </Stack>
      </Container>
    </>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
