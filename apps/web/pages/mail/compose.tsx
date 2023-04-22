import React, { useState, type ReactElement } from "react";
import Image from "next/image";
import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Container,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue, useSetState } from "@mantine/hooks";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { IconCircleMinus, IconCirclePlus } from "@tabler/icons";
import { HttpStatusCode, type AxiosError } from "axios";
import { useSession } from "next-auth/react";

import { CharacterAvatar } from "~/components/Avatar";
import { EvemailEditor } from "~/components/EvemailEditor";
import { EsiSearchSelect } from "~/components/Select";
import { CSPACostText, CharacterNameText } from "~/components/Text";
import { postCharactersCharacterIdMail } from "~/esi/mail";
import { type PostUniverseNames200ItemCategory } from "~/esi/model";
import { DefaultLayout } from "~/layout";

export default function Page() {
  const { data: session } = useSession();
  const form = useForm<{
    recipients: string[];
    subject: string;
    body: string;
  }>({
    initialValues: {
      recipients: [],
      subject: "",
      body: "",
    },
    validate: {
      recipients: (value) => {
        if (value.length === 0) {
          return "At least one recipient is required";
        }
      },
      subject: (value) => {
        if (value.length === 0) {
          return "Subject is required";
        }
      },
    },
  });
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(
    null,
  );
  const [searchString, setSearchString] = useState<string>("");
  const [debouncedSearchString] = useDebouncedValue(searchString, 1000);
  const [namesCache, setNamesCache] = useSetState<
    Record<number, { name: string; category: PostUniverseNames200ItemCategory }>
  >({});

  const handleAddRecipient = () => {
    if (!selectedRecipient) {
      return showNotification({
        message: "No recipient selected",
      });
    }
    if (form.values.recipients.includes(selectedRecipient)) {
      return showNotification({
        message: "Recipient already added",
      });
    }
    form.setFieldValue("recipients", [
      ...form.values.recipients,
      selectedRecipient,
    ]);
    setSearchString("");
    setSelectedRecipient(null);
  };

  const handleRemoveRecipient = (characterId: string) => {
    form.setFieldValue(
      "recipients",
      form.values.recipients.filter((r) => r !== characterId),
    );
  };

  const handleSend = async (values: typeof form.values) => {
    console.log("values:", values);
    try {
      if (!session?.user.id) {
        return showNotification({
          message: "Not logged in",
        });
      }
      const result = await postCharactersCharacterIdMail(session?.user.id, {
        approved_cost: 0,
        body: values.body,
        recipients: values.recipients.map((r) => ({
          recipient_id: Number(r),
          recipient_type: "character",
        })),
        subject: values.subject,
      });
      if (result.status === HttpStatusCode.Created) {
        showNotification({
          message: "Message sent",
        });
      } else {
        showNotification({
          message: "Failed to send message",
        });
      }
    } catch (e) {
      const response: { error: string } = (e as AxiosError).response?.data as {
        error: string;
      };
      const errorMessage = response.error;
      // check if the error is due to insufficient CSPA
      if (errorMessage.includes("ContactCostNotApproved")) {
        const detailsStart = errorMessage.indexOf("{");
        const detailsEnd = errorMessage.lastIndexOf("}");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const details: { totalCost: number } = JSON.parse(
          errorMessage.substring(detailsStart, detailsEnd + 1),
        );
        openConfirmModal({
          title: "Insufficient CSPA",
          children: (
            <Stack>
              <Alert color="red">
                The message failed to send due to a{" "}
                <Anchor
                  target="_blank"
                  href="https://github.com/esi/esi-issues/issues/136"
                >
                  bug in the ESI API
                </Anchor>
                , where CSPA charges may not be calculated correctly before the
                message is sent.
              </Alert>
              <Group position="apart">
                <Text>New CSPA Cost</Text>
                <Text>{details.totalCost.toLocaleString()} ISK</Text>
              </Group>
            </Stack>
          ),
          labels: {
            confirm: `Pay ${details.totalCost} ISK CSPA`,
            cancel: "Cancel",
          },
          onConfirm: () => {
            void (async () => {
              if (!session?.user.id) {
                return showNotification({
                  message: "Not logged in",
                });
              }
              const result = await postCharactersCharacterIdMail(
                session?.user.id,
                {
                  approved_cost: details.totalCost,
                  body: values.body,
                  recipients: values.recipients.map((r) => ({
                    recipient_id: Number(r),
                    recipient_type: "character",
                  })),
                  subject: values.subject,
                },
              );
              if (result.status === HttpStatusCode.Created) {
                showNotification({
                  message: `Message sent. You were charged ${details.totalCost} ISK for CSPA.`,
                });
              }
            })();
          },
          onCancel() {
            showNotification({
              message: "Message not sent",
            });
          },
        });
      } else {
        showNotification({
          message: "Error: " + errorMessage,
        });
      }
    }
  };

  return (
    <Container p="xl">
      <form
        onSubmit={form.onSubmit((values) => {
          form.validate();
          if (form.isValid()) void handleSend(values);
        })}
      >
        <Stack spacing="xl">
          <Title order={1}>Compose New Message</Title>
          <Grid>
            <Grid.Col span={2}>
              <Text>Subject</Text>
            </Grid.Col>
            <Grid.Col span="auto">
              <TextInput
                placeholder="What is this all about?"
                {...form.getInputProps("subject")}
              />
            </Grid.Col>
            <Grid.Col span="content">
              <Button
                type="submit"
                leftIcon={
                  <Image
                    src={"/icons/evemail.png"}
                    alt="Labels"
                    width={32}
                    height={32}
                  />
                }
              >
                Send
              </Button>
            </Grid.Col>
          </Grid>
          <Grid>
            <Grid.Col span={2}>
              <Text>Recipients</Text>
            </Grid.Col>
            <Grid.Col span="auto">
              <Stack>
                {form.values.recipients.length > 0 && (
                  <Stack>
                    <SimpleGrid cols={2}>
                      {form.values.recipients.map((characterId) => (
                        <Group key={characterId} position="apart">
                          <Group>
                            <CharacterAvatar
                              characterId={characterId}
                              size="sm"
                              radius="xl"
                            />
                            <CharacterNameText
                              characterId={Number(characterId)}
                            />
                          </Group>
                          <Group>
                            <Text size="xs" color="dimmed">
                              CSPA:{" "}
                              <CSPACostText
                                span
                                characterIds={Number(characterId)}
                              />
                            </Text>
                            <ActionIcon
                              size="sm"
                              onClick={() => handleRemoveRecipient(characterId)}
                              color="red"
                            >
                              <IconCircleMinus />
                            </ActionIcon>
                          </Group>
                        </Group>
                      ))}
                    </SimpleGrid>
                  </Stack>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddRecipient();
                  }}
                >
                  <Group align="center">
                    <EsiSearchSelect
                      label={undefined}
                      placeholder={
                        form.values.recipients.length > 0
                          ? "Add another recipient"
                          : "Add a recipient"
                      }
                      size="xs"
                      w={300}
                      value={selectedRecipient}
                      onChange={setSelectedRecipient}
                      searchValue={searchString}
                      debouncedSearchValue={debouncedSearchString}
                      onSearchChange={setSearchString}
                      namesCache={namesCache}
                      setNamesCache={setNamesCache}
                    />
                    <ActionIcon
                      size="sm"
                      disabled={!selectedRecipient}
                      radius="xl"
                      onClick={handleAddRecipient}
                      color="green"
                    >
                      <IconCirclePlus />
                    </ActionIcon>
                  </Group>
                </form>
              </Stack>
              {form.errors.recipients && (
                <Text size="xs" color="red">
                  {form.errors.recipients}
                </Text>
              )}
            </Grid.Col>
          </Grid>
          <Stack spacing={0}>
            <EvemailEditor
              content={form.values.body}
              onContentUpdate={(content) => form.setFieldValue("body", content)}
            />
            {form.errors.recipients && (
              <Text size="xs" color="red">
                {form.errors.body}
              </Text>
            )}
          </Stack>
        </Stack>
      </form>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <DefaultLayout>{page}</DefaultLayout>;
};
