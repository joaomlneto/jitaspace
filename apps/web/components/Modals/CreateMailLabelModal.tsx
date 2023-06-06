import React from "react";
import { Button, ColorPicker, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { type ContextModalProps } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { type AxiosError } from "axios";
import { useSession } from "next-auth/react";

import {
  postCharactersCharacterIdMailLabels,
  PostCharactersCharacterIdMailLabelsBodyColor,
} from "@jitaspace/esi-client";
import { randomProperty } from "@jitaspace/utils";

export function CreateMailLabelModal({
  context,
  id,
}: ContextModalProps<{
  /* empty */
}>) {
  const { data: session } = useSession();
  const form = useForm({
    initialValues: {
      name: "",
      color: randomProperty(PostCharactersCharacterIdMailLabelsBodyColor),
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
    <form
      onSubmit={form.onSubmit((values) => {
        void (async (values) => {
          try {
            console.log(values);
            if (!session?.user.id) {
              return showNotification({
                title: "Error creating label",
                message: `Error creating label ${values.name}: Not logged in`,
              });
            }
            const result = await postCharactersCharacterIdMailLabels(
              session?.user.id,
              {
                name: values.name,
                color: values.color,
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
                ((e as AxiosError).response?.data as { error?: unknown }).error
              }`,
            });
          }
        })(values);
      })}
    >
      <Stack>
        <TextInput withAsterisk label="Name" {...form.getInputProps("name")} />
        <Stack spacing={0}>
          <Text size="sm" fw={500}>
            Color
          </Text>
          <ColorPicker
            style={{
              backgroundColor: form.values.color as string,
              borderRadius: 5,
              padding: 5,
              paddingTop: 0,
            }}
            format="hex"
            focusable={true}
            withPicker={false}
            swatches={Object.keys(PostCharactersCharacterIdMailLabelsBodyColor)}
            swatchesPerRow={18}
            fullWidth
            {...form.getInputProps("color")}
          />
        </Stack>
        <Button type="submit">Create Label</Button>
      </Stack>
    </form>
  );
}
