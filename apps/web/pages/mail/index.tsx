import React, { useEffect, type ReactElement } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  ActionIcon,
  Alert,
  Button,
  Center,
  Container,
  Grid,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { useSession } from "next-auth/react";
import { NextSeo } from "next-seo";
import useSWRInfinite from "swr/infinite";

import { type GetCharactersCharacterIdMail200Item } from "@jitaspace/esi-client";
import { toArrayIfNot } from "@jitaspace/utils";

import { MailboxDataTable } from "~/components/MailboxTable";
import { EmailLabelMultiSelect } from "~/components/MultiSelect";
import { MailLayout } from "~/layout";

export default function Page() {
  const router = useRouter();
  const labels = router.query.labels;
  const { data: session } = useSession();

  const [selectedLabels, setSelectedLabels] = React.useState<string[]>([]);

  useEffect(() => {
    if (router.isReady) {
      setSelectedLabels(toArrayIfNot(labels ?? []) ?? []);
    }
  }, [router.isReady, labels]);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetCharactersCharacterIdMail200Item[]>(
      function getKey(
        pageIndex,
        previousPageData: GetCharactersCharacterIdMail200Item[],
      ) {
        if (!router.isReady || !session?.user.id) {
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
      { refreshInterval: 1000, revalidateAll: true },
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
            <Title order={1}>EveMail</Title>
            {(isLoading || isValidating) && (
              <Group>
                <Loader size="xs" />
                {isLoading && <Text>Loading</Text>}
                {isValidating && <Text>Refreshing</Text>}
              </Group>
            )}
          </Group>
          <Grid align="flex-end" justify="space-between">
            <Grid.Col span="content">
              <Group noWrap spacing="xs">
                <Tooltip label="Compose new message">
                  <ActionIcon
                    variant="default"
                    size="lg"
                    onClick={() =>
                      modals.openContextModal({
                        modal: "composeMail",
                        title: "Compose new message",
                        size: "xl",
                        innerProps: {},
                      })
                    }
                  >
                    <Image
                      src="/icons/evemailcompose.png"
                      alt="Compose new message"
                      width={32}
                      height={32}
                    />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="View Mailing List Subscriptions">
                  <ActionIcon
                    variant="default"
                    size="lg"
                    onClick={() =>
                      modals.openContextModal({
                        modal: "viewMailingListSubscriptions",
                        title: "Active Mailing List Subscriptions",
                        size: "md",
                        innerProps: {},
                      })
                    }
                  >
                    <Image
                      src="/icons/grouplist.png"
                      alt="Mailing Lists"
                      width={32}
                      height={32}
                    />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Manage Labels">
                  <ActionIcon
                    variant="default"
                    size="lg"
                    onClick={() =>
                      modals.openContextModal({
                        modal: "manageMailLabels",
                        title: "Manage Labels",
                        size: "md",
                        innerProps: {},
                      })
                    }
                  >
                    <Image
                      src="/icons/evemailtag.png"
                      alt="Labels"
                      width={32}
                      height={32}
                    />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Frequently Asked Questions">
                  <ActionIcon
                    variant="default"
                    size="lg"
                    onClick={() =>
                      modals.openContextModal({
                        modal: "mailFaq",
                        title: "Frequently Asked Questions",
                        size: "xl",
                        innerProps: {},
                      })
                    }
                  >
                    <Image
                      src="/icons/info.png"
                      alt="FAQ"
                      width={32}
                      height={32}
                    />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Grid.Col>
            <Grid.Col span="content">
              <EmailLabelMultiSelect
                size="xs"
                style={{ minWidth: "240px" }}
                label="Filter by label"
                value={selectedLabels}
                onChange={(value: string[]) => {
                  setSelectedLabels(value);
                  void router.push(
                    {
                      pathname: router.pathname,
                      query: {
                        labels: value,
                      },
                    },
                    undefined,
                    {
                      shallow: true,
                    },
                  );
                }}
                defaultValue={selectedLabels}
              />
            </Grid.Col>
          </Grid>
          {data && (
            <MailboxDataTable data={mergedData} mutate={() => void mutate()} />
          )}
          {hasMore && (
            <Button w="100%" onClick={() => void setSize(size + 1)}>
              Load more messages
            </Button>
          )}
          {(isLoading || isValidating) && !hasMore && (
            <Group noWrap>
              <Loader size="sm" />
              <Text>Loading messages</Text>
            </Group>
          )}
          {!isLoading && !isValidating && !hasMore && (
            <Center>
              <Text color="dimmed">No more messages</Text>
            </Center>
          )}
        </Stack>
      </Container>
    </>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
