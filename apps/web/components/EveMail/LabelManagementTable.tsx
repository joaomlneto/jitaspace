import React from "react";
import { Button, Group, Table, Text } from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { useSession } from "next-auth/react";

import {
  deleteCharactersCharacterIdMailLabelsLabelId,
  useGetCharactersCharacterIdMailLabels,
} from "@jitaspace/esi-client";
import { isSpecialLabelId } from "@jitaspace/utils";

import { MailLabelColorSwatch } from "~/components/ColorSwatch";
import { LabelNameText } from "~/components/Text";

export function LabelManagementTable() {
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
                          Are you sure you want to delete the label {label.name}
                          ?
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
                        })(),
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
  );
}
