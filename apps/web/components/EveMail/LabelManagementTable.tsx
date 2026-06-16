import { Button, Group, Table, Text } from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";

import { useCharacterMailLabels } from "@jitaspace/hooks";
import { isSpecialLabelId } from "@jitaspace/utils";

import { MailLabelColorSwatch } from "~/components/ColorSwatch";
import { LabelName } from "~/components/Text";

export interface LabelManagementTableProps {
  characterId: number;
}

export function LabelManagementTable({
  characterId,
}: Readonly<LabelManagementTableProps>) {
  const { data: labels, deleteLabel } = useCharacterMailLabels(characterId);

  const handleDeleteLabel = async (
    labelId: number | undefined,
    labelName: string | undefined,
  ) => {
    if (!labelId) {
      return showNotification({
        title: "Error deleting label",
        message: `Error deleting label ${labelName}: No label id`,
      });
    }
    const result = await deleteLabel(labelId);
    if (result.success) {
      showNotification({
        title: "Label deleted",
        message: `Label ${labelName} deleted. It make take up to 30 seconds to disappear from the list.`,
      });
    } else {
      showNotification({
        title: "Error deleting label",
        message: result.error,
      });
    }
  };

  return (
    <Table verticalSpacing="xs" highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <th>Labels</th>
          <th></th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {labels?.data.labels?.map((label) => (
          <Table.Tr key={label.label_id}>
            <Table.Td>
              <Group>
                <MailLabelColorSwatch
                  characterId={characterId}
                  labelId={label.label_id}
                  size={16}
                />
                <LabelName characterId={characterId} labelId={label.label_id} />
              </Group>
            </Table.Td>
            <Table.Td align="right">
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
                        void handleDeleteLabel(label.label_id, label.name),
                    });
                  }}
                >
                  Delete
                </Button>
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
