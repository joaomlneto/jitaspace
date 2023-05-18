import React, { type ReactElement } from "react";
import {
  Button,
  ColorPicker,
  Container,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { closeAllModals, openConfirmModal, openModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { type AxiosError } from "axios";
import { useSession } from "next-auth/react";

import {
  PostCharactersCharacterIdMailLabelsBodyColor,
  deleteCharactersCharacterIdMailLabelsLabelId,
  postCharactersCharacterIdMailLabels,
  useGetCharactersCharacterIdMailLabels,
} from "@jitaspace/esi-client";
import { isSpecialLabelId, randomProperty } from "@jitaspace/utils";

import { MailLabelColorSwatch } from "~/components/ColorSwatch";
import { LabelNameText } from "~/components/Text";
import { MailNavbarLayout } from "~/layout";

function CreateLabelModal() {
  const { data: session } = useSession();
  const form = useForm({
    initialValues: {
      name: "",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                color: values.color,
              },
            );

            if (result.status >= 200 && result.status < 300) {
              showNotification({
                title: "Label created",
                message: `Label ${values.name} created. It make take up to 30 seconds to appear in the list.`,
              });
              closeAllModals();
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

export default function Page() {
  const { data: session } = useSession();

  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    session?.user.id ?? 0,
    undefined,
    {
      swr: {
        enabled: !!session?.user?.id,
      },
    },
  );

  return (
    <Container>
      <Group position="apart">
        <h1>Manage Labels</h1>
        <Button
          onClick={() =>
            openModal({
              title: "Create Label",
              children: <CreateLabelModal />,
            })
          }
        >
          Create Label
        </Button>
      </Group>
      <Table verticalSpacing="xs" highlightOnHover striped>
        <thead>
          <tr>
            <th>Labels</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {labels?.data.labels?.map((label) => (
            <tr key={label.label_id}>
              <td>
                <Group>
                  <MailLabelColorSwatch labelId={label.label_id} size={16} />
                  <LabelNameText labelId={label.label_id} />
                </Group>
              </td>
              <td align="right">
                {!isSpecialLabelId(label.label_id) && (
                  <Button
                    size="xs"
                    color="red"
                    onClick={() => {
                      openConfirmModal({
                        title: "Delete Label",
                        children: (
                          <Text>
                            Are you sure you want to delete the label{" "}
                            {label.name}?
                          </Text>
                        ),
                        labels: {
                          confirm: "Delete",
                          cancel: "Cancel",
                        },
                        onConfirm: () =>
                          void (async () => {
                            if (!session?.user.id) {
                              return showNotification({
                                title: "Error deleting label",
                                message: `Error deleting label ${label.name}: Not logged in`,
                              });
                            }
                            if (!label.label_id) {
                              return showNotification({
                                title: "Error deleting label",
                                message: `Error deleting label ${label.name}: No label id`,
                              });
                            }
                            await deleteCharactersCharacterIdMailLabelsLabelId(
                              session?.user.id,
                              label.label_id,
                            );
                            showNotification({
                              title: "Label deleted",
                              message: `Label ${label.name} deleted. It make take up to 30 seconds to disappear from the list.`,
                            });
                          }),
                      });
                    }}
                  >
                    Delete
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailNavbarLayout>{page}</MailNavbarLayout>;
};
