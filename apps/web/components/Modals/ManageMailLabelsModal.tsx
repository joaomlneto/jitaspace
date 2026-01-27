"use client";

import type { ContextModalProps } from "@mantine/modals";
import type { AxiosError } from "axios";

import { Button, Grid, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";

import {
  postCharactersCharacterIdMailLabels,
  postCharactersCharacterIdMailLabelsMutationRequestColorEnum,
} from "@jitaspace/esi-client";
import { useAccessToken, useSelectedCharacter } from "@jitaspace/hooks";
import { MailLabelColorSelect } from "@jitaspace/ui";
import { randomProperty } from "@jitaspace/utils";

import { LabelManagementTable } from "~/components/EveMail";

export function ManageMailLabelsModal({
  context,
  id,
}: ContextModalProps<{
  /* empty */
}>) {
  const character = useSelectedCharacter();
  const characterId = character?.characterId;
  const { accessToken, authHeaders: _authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-mail.organize_mail.v1"],
  });
  const form = useForm({
    initialValues: {
      name: "",
      color: randomProperty(
        postCharactersCharacterIdMailLabelsMutationRequestColorEnum,
      ),
    },
    validate: {
      name: (value) => {
        if (value.length < 1) {
          return "Name cannot be empty";
        }
        // max 40 characters
        if (value.length > 40) {
          return "Name must be at most 40 characters long";
        }
      },
    },
  });
  return (
    <Stack gap="xl">
      {characterId && <LabelManagementTable characterId={characterId} />}
      <form
        onSubmit={form.onSubmit((values) => {
          void (async (values) => {
            try {
              console.log(values);
              if (accessToken === null || !characterId) {
                return showNotification({
                  title: "Error creating label",
                  message: `Error creating label ${values.name}: Not logged in`,
                });
              }
              const result = await postCharactersCharacterIdMailLabels(
                characterId,
                {
                  name: values.name,
                  color: values.color,
                },
                {
                  token: accessToken,
                },
              );

              if (result.status >= 200 && result.status < 300) {
                showNotification({
                  title: "Label created",
                  message: `Label ${values.name} created. It make take up to 30 seconds to appear in the list.`,
                });
                context.closeModal(id);
              } else {
                showNotification({
                  title: "Error creating label",
                  message: `Error creating label ${values.name}: ${result.data}`,
                });
              }
            } catch (e) {
              showNotification({
                title: "Error creating label",
                message: `Error creating label ${values.name}: ${
                  ((e as AxiosError).response?.data as { error?: unknown })
                    .error
                }`,
              });
            }
          })(values);
        })}
      >
        <Title order={6}>Create New Label</Title>
        <Grid align="end">
          <Grid.Col span="auto">
            <TextInput
              withAsterisk
              miw={120}
              label="Name"
              {...form.getInputProps("name")}
            />
          </Grid.Col>
          <Grid.Col span="content">
            <MailLabelColorSelect
              label="Color"
              {...form.getInputProps("color")}
            />
          </Grid.Col>
          <Grid.Col span="content">
            <Button type="submit">Create</Button>
          </Grid.Col>
        </Grid>
      </form>
    </Stack>
  );
}
