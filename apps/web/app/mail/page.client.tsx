"use client";

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
import { parseAsArrayOf, parseAsInteger, useQueryState } from "nuqs";
import posthog from "posthog-js";

import {
  EvemailComposeIcon,
  EveMailIcon,
  EveMailTagIcon,
  GroupListIcon,
} from "@jitaspace/eve-icons";
import { useCharacterMails, useSelectedCharacter } from "@jitaspace/hooks";

import { MailboxTable } from "~/components/EveMail";
import { EveMailLabelMultiSelect } from "~/components/MultiSelect/EveMailLabelMultiSelect";

export default function Page() {
  const character = useSelectedCharacter();

  // parseAsArrayOf defaults to a comma separator, keeping the `?labels=1,2`
  // format this page already wrote, so existing shared links keep working.
  // The integer item-parser also validates: nuqs drops items it can't parse, so
  // a hand-edited `?labels=abc,2` yields [2] instead of forwarding NaN to ESI.
  const [selectedLabels, setSelectedLabels] = useQueryState(
    "labels",
    parseAsArrayOf(parseAsInteger)
      .withDefault([])
      .withOptions({ history: "replace" }),
  );

  const {
    messages,
    hasMoreMessages,
    loadMoreMessages,
    isLoading,
    mutate,
    error,
  } = useCharacterMails(character?.characterId, selectedLabels);

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
                  onClick={() => {
                    posthog.capture("mail_compose_opened");
                    modals.openContextModal({
                      modal: "composeMail",
                      title: "Compose new message",
                      size: "xl",
                      innerProps: {},
                    });
                  }}
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
                        characterId: character.characterId,
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
                  onClick={() => {
                    posthog.capture("mail_labels_opened");
                    modals.openContextModal({
                      modal: "manageMailLabels",
                      title: "Manage Labels",
                      size: "md",
                      innerProps: {},
                    });
                  }}
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
                value={selectedLabels.map(String)}
                onChange={(value: string[]) =>
                  void setSelectedLabels(value.map(Number))
                }
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
          <Button
            w="100%"
            onClick={() => {
              posthog.capture("mail_load_more", {
                current_message_count: messages.length,
              });
              void loadMoreMessages();
            }}
          >
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
