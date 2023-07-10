import React from "react";
import { ActionIcon, Group, Menu, Text } from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import {
  IconCheck,
  IconMail,
  IconMailOpened,
  IconMenu2,
  IconTrash,
} from "@tabler/icons-react";

import {
  deleteCharactersCharacterIdMailMailId,
  putCharactersCharacterIdMailMailId,
  useEsiClientContext,
  useGetCharactersCharacterIdMailLabels,
} from "@jitaspace/esi-client";
import { MailLabelColorSwatch } from "@jitaspace/ui";
import { isSpecialLabelId } from "@jitaspace/utils";

type Message = {
  from?: number;
  is_read?: boolean;
  labels?: number[];
  mail_id?: number;
  recipients?: {
    recipient_id: number;
    recipient_type: string;
  }[];
  subject?: string;
  timestamp?: string;
  // This is a custom property that we add to the data
  // to indicate whether the mail has been deleted or not.
  // This is to try and be more responsive to the user, since the API
  // takes up to 30 seconds to actually show changes.
  isDeleted?: boolean;
};

export type MessageMenuProps = {
  mail: Message;
  mutate?: () => void;
  data?: Message[];
};

export function MessageMenu({ mail, mutate, data }: MessageMenuProps) {
  const { characterId, isTokenValid } = useEsiClientContext();
  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    characterId ?? 1,
    undefined,
    {
      swr: {
        enabled: isTokenValid,
      },
    },
  );

  return (
    <Menu>
      <Menu.Target>
        <ActionIcon size="sm">
          <IconMenu2 />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Message Labels</Menu.Label>
        {labels?.data.labels
          ?.filter((label) => !isSpecialLabelId(label.label_id))
          .map((label) => (
            <Menu.Item
              key={label.label_id}
              className="umami--click--modify-label-menu-item"
              onClick={() => {
                void (async () => {
                  if (characterId === undefined) {
                    return showNotification({
                      title: "Error",
                      message: "Not authenticated.",
                      color: "red",
                    });
                  }
                  if (mail.mail_id === undefined) {
                    return showNotification({
                      title: "Error",
                      message: "Message ID is undefined.",
                    });
                  }
                  await putCharactersCharacterIdMailMailId(
                    characterId,
                    mail.mail_id,
                    {
                      labels:
                        label.label_id && mail.labels?.includes(label.label_id)
                          ? mail.labels?.filter(
                              (labelId) => labelId !== label.label_id,
                            )
                          : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            [...(mail.labels ?? []), label.label_id!],
                    },
                  );

                  // optimistic update
                  const item = data?.find(
                    (item) => item.mail_id === mail.mail_id,
                  );
                  if (item) {
                    item.labels =
                      label.label_id && mail.labels?.includes(label.label_id)
                        ? mail.labels?.filter(
                            (labelId) => labelId !== label.label_id,
                          )
                        : [...(mail.labels ?? []), label.label_id!];
                  }

                  // Show a notification
                  showNotification({
                    title: "Message Updated",
                    message: `Message updated successfully. It may take up to 30 seconds for the change to be visible.`,
                  });
                  mutate?.();
                })();
              }}
            >
              <Group>
                <MailLabelColorSwatch labelId={label.label_id} size={16}>
                  {label.label_id && mail.labels?.includes(label.label_id) && (
                    <IconCheck size={16} />
                  )}
                </MailLabelColorSwatch>
                {label.label_id && mail.labels?.includes(label.label_id)
                  ? `Remove ${label.name}`
                  : `Add ${label.name}`}
              </Group>
            </Menu.Item>
          ))}
        <Menu.Divider />
        <Menu.Item
          className={`umami--click--mark-as-${
            mail.is_read ? "unread" : "read"
          }-menu-item`}
          icon={
            mail.is_read ? <IconMailOpened size={16} /> : <IconMail size={16} />
          }
          onClick={() => {
            void (async () => {
              if (characterId === undefined) {
                return showNotification({
                  title: "Error",
                  message: "Not authenticated.",
                  color: "red",
                });
              }

              if (mail.mail_id === undefined) {
                return showNotification({
                  title: "Error",
                  message: "Message ID is undefined.",
                });
              }
              await putCharactersCharacterIdMailMailId(
                characterId,
                mail.mail_id,
                {
                  read: !mail.is_read,
                },
              );
              if (data) {
                data.find((item) => item.mail_id === mail.mail_id)!.is_read =
                  !mail.is_read;
              }
              showNotification({
                title: "Message Updated",
                message: `Message marked successfully as ${
                  mail.is_read ? "Unread" : "Read"
                }. It may take up to 30 seconds for the change to be visible.`,
              });
              mutate?.();
            })();
          }}
        >
          Mark as {mail.is_read ? "Unread" : "Read"}
        </Menu.Item>
        <Menu.Item
          icon={<IconTrash size={16} />}
          color="red"
          className="umami--click--delete-message-menu-item"
          onClick={() => {
            openConfirmModal({
              title: "Delete Message",
              labels: {
                confirm: "Delete",
                cancel: "Cancel",
              },
              children: (
                <Text>
                  Are you sure you want to delete this message? This action
                  cannot be undone.
                </Text>
              ),
              onConfirm: () =>
                void (async () => {
                  if (characterId === undefined) {
                    return showNotification({
                      title: "Error",
                      message: "Not authenticated.",
                      color: "red",
                    });
                  }

                  if (mail.mail_id === undefined) {
                    return showNotification({
                      title: "Error",
                      message: "Message ID is undefined.",
                    });
                  }
                  await deleteCharactersCharacterIdMailMailId(
                    characterId,
                    mail.mail_id,
                  );
                  if (data) {
                    data.find(
                      (message) => message.mail_id === mail.mail_id,
                    )!.isDeleted = true;
                  }
                  showNotification({
                    title: "Message Deleted",
                    message: `Message deleted successfully. It may take up to 30 seconds for the change to be visible.`,
                  });
                  mutate?.();
                })(),
            });
          }}
        >
          Delete Message
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
