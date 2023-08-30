import React from "react";
import { Button, Group, Table, Text } from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";

import {
  deleteCharactersCharacterIdMailLabelsLabelId,
  useGetCharactersCharacterIdMailLabels,
} from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { LabelName, MailLabelColorSwatch } from "@jitaspace/ui";
import { isSpecialLabelId } from "@jitaspace/utils";

export function LabelManagementTable() {
  const { characterId, isTokenValid } = useEsiClientContext();

  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    characterId ?? 0,
    undefined,
    {
      swr: {
        enabled: isTokenValid,
      },
    },
  );

  return (
    <Table verticalSpacing="xs" highlightOnHover>
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
                <LabelName labelId={label.label_id} />
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
                          if (!isTokenValid || !characterId) {
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
                            characterId,
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
