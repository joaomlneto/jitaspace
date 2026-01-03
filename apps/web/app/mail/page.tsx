"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

import {
  EvemailComposeIcon,
  EveMailIcon,
  EveMailTagIcon,
  GroupListIcon,
} from "@jitaspace/eve-icons";
import { useCharacterMails, useSelectedCharacter } from "@jitaspace/hooks";
import { EveMailLabelMultiSelect } from "@jitaspace/ui";
import { toArrayIfNot } from "@jitaspace/utils";

import { MailboxTable } from "~/components/EveMail";

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const labels = toArrayIfNot(searchParams?.get("labels") ?? []);
  const character = useSelectedCharacter();

  const [selectedLabels, setSelectedLabels] = React.useState<string[]>([]);

  const {
    messages,
    hasMoreMessages,
    loadMoreMessages,
    isLoading,
    mutate,
    error,
  } = useCharacterMails(character?.characterId, selectedLabels.map(Number));

  return (
    <Container size="xl">
      <Stack>
        {error && (
          <Container size="xs">
            <Alert title="Error loading messages">
              Error loading messages.
            </Alert>
          </Container>
        )}
        <Group>
          <EveMailIcon width={48} />
          <Title order={1}>EveMail</Title>
        </Group>
        <Grid align="flex-end" justify="space-between">
          <Grid.Col span="content">
            <Group wrap="nowrap" gap="xs">
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
                  <EvemailComposeIcon
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
                  onClick={() => {
                    if (!character) {
                      console.error(
                        "Cannot open viewMailingListSubscriptions modal, as no character is active",
                      );
                      return;
                    }
                    modals.openContextModal({
                      modal: "viewMailingListSubscriptions",
                      title: "Active Mailing List Subscriptions",
                      size: "md",
                      innerProps: {
                        characterId: character?.characterId,
                      },
                    });
                  }}
                >
                  <GroupListIcon alt="Mailing Lists" width={32} height={32} />
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
                  <EveMailTagIcon alt="Labels" width={32} height={32} />
                </ActionIcon>
              </Tooltip>
              {isLoading && (
                <Tooltip label="Loading messages...">
                  <Loader size="sm" />
                </Tooltip>
              )}
            </Group>
          </Grid.Col>
          <Grid.Col span="content">
            {character && (
              <EveMailLabelMultiSelect
                characterId={character.characterId}
                size="xs"
                style={{ minWidth: "240px" }}
                label="Filter by label"
                value={selectedLabels}
                onChange={(value: string[]) => {
                  setSelectedLabels(value);
                  const params = new URLSearchParams({
                    labels: value.join(","),
                  });
                  void router.push(`${pathname}?${params.toString()}`);
                }}
                defaultValue={selectedLabels}
              />
            )}
          </Grid.Col>
        </Grid>
        {character && messages.length > 0 && (
          <MailboxTable
            characterId={character.characterId}
            data={messages}
            mutate={() => void mutate()}
          />
        )}
        {hasMoreMessages && (
          <Button w="100%" onClick={() => loadMoreMessages()}>
            Load more messages
          </Button>
        )}
        {isLoading && !hasMoreMessages && (
          <Group wrap="nowrap">
            <Loader size="sm" />
            <Text>Loading messages</Text>
          </Group>
        )}
        {!isLoading && !hasMoreMessages && (
          <Center>
            <Text c="dimmed">No more messages</Text>
          </Center>
        )}
      </Stack>
    </Container>
  );
}
