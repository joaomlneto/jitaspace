import React from "react";
import { ActionIcon, Anchor, Group, Menu, Text } from "@mantine/core";
import { openConfirmModal, openContextModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import {
  IconCheck,
  IconMail,
  IconMailOpened,
  IconMenu2,
  IconTrash,
} from "@tabler/icons-react";
import { format } from "date-fns";
import { DataTable } from "mantine-datatable";
import { useSession } from "next-auth/react";

import {
  deleteCharactersCharacterIdMailMailId,
  putCharactersCharacterIdMailMailId,
  useGetCharactersCharacterIdMailLabels,
} from "@jitaspace/esi-client";
import {
  EveMailSenderAvatar,
  EveMailSenderName,
  LabelName,
} from "@jitaspace/ui";
import { isSpecialLabelId } from "@jitaspace/utils";

import { MailLabelColorSwatch } from "~/components/ColorSwatch";

type Props = {
  data: {
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
  }[];
  mutate?: () => void;
};

export default function MailboxDataTable({ data, mutate }: Props) {
  const { data: session } = useSession();
  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    session?.user?.id ?? 1,
    undefined,
    {
      swr: {
        enabled: !!session?.user?.id,
      },
    },
  );
  return (
    <DataTable
      highlightOnHover
      striped
      idAccessor="mail_id"
      columns={[
        {
          title: "Sender",
          accessor: "from",
          render: (mail) => {
            return (
              <Group noWrap key={mail.mail_id}>
                <EveMailSenderAvatar
                  messageId={mail.mail_id}
                  size="sm"
                  radius="xl"
                />
                <EveMailSenderName
                  messageId={mail.mail_id}
                  fw={mail.is_read ? "normal" : "bold"}
                />
              </Group>
            );
          },
        },
        {
          title: "Subject",
          accessor: "subject",
          render: (mail) => (
            <Anchor
              onClick={() => {
                if (!mail.mail_id) {
                  showNotification({
                    title: "Error",
                    message: "Mail ID is not defined for this mail!?",
                  });
                  return;
                }
                openContextModal({
                  modal: "viewMailMessage",
                  title: mail.subject,
                  size: "xl",
                  innerProps: { messageId: mail.mail_id },
                });
              }}
              fw={mail.is_read ? "normal" : "bold"}
            >
              {mail.subject !== undefined &&
                (mail.subject.length > 0 ? (
                  mail.subject
                ) : (
                  <Anchor fs="italic" fw={150} span>
                    (No Subject)
                  </Anchor>
                ))}
            </Anchor>
          ),
        },
        {
          title: "Received",
          accessor: "timestamp",
          render: (mail) =>
            mail.timestamp && (
              <Text fw={mail.is_read ? "normal" : "bold"}>
                {format(new Date(mail.timestamp), "yyyy-MM-dd HH:mm")}
              </Text>
            ),
        },
        {
          title: "Labels",
          accessor: "labels",
          render: (mail) => (
            <Group spacing="xl">
              {mail.labels
                ?.map((labelIndex) =>
                  labels?.data.labels?.find(
                    (label) => label.label_id === labelIndex,
                  ),
                )
                .map(
                  (item) =>
                    item && (
                      <Group noWrap spacing="xs" key={item.label_id}>
                        <MailLabelColorSwatch
                          labelId={item.label_id}
                          size={16}
                        />
                        <LabelName labelId={item.label_id} />
                      </Group>
                    ),
                )}
            </Group>
          ),
        },
        {
          title: "",
          accessor: "mail_id",
          render: (mail) => (
            <Group position="right">
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
                            if (session?.user.id === undefined) {
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
                              session?.user.id,
                              mail.mail_id,
                              {
                                labels:
                                  label.label_id &&
                                  mail.labels?.includes(label.label_id)
                                    ? mail.labels?.filter(
                                        (labelId) => labelId !== label.label_id,
                                      )
                                    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                      [...(mail.labels ?? []), label.label_id!],
                              },
                            );
                            const item = data.find(
                              (item) => item.mail_id === mail.mail_id,
                            );
                            if (item) {
                              item.labels =
                                label.label_id &&
                                mail.labels?.includes(label.label_id)
                                  ? mail.labels?.filter(
                                      (labelId) => labelId !== label.label_id,
                                    )
                                  : [...(mail.labels ?? []), label.label_id!];
                            }
                            showNotification({
                              title: "Message Updated",
                              message: `Message updated successfully. It may take up to 30 seconds for the change to be visible.`,
                            });
                            if (mutate) mutate();
                          })();
                        }}
                      >
                        <Group>
                          <MailLabelColorSwatch
                            labelId={label.label_id}
                            size={16}
                          >
                            {label.label_id &&
                              mail.labels?.includes(label.label_id) && (
                                <IconCheck size={16} />
                              )}
                          </MailLabelColorSwatch>
                          {label.label_id &&
                          mail.labels?.includes(label.label_id)
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
                      mail.is_read ? (
                        <IconMailOpened size={16} />
                      ) : (
                        <IconMail size={16} />
                      )
                    }
                    onClick={() => {
                      void (async () => {
                        if (session?.user.id === undefined) {
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
                          session?.user.id,
                          mail.mail_id,
                          {
                            read: !mail.is_read,
                          },
                        );
                        data.find(
                          (item) => item.mail_id === mail.mail_id,
                        )!.is_read = !mail.is_read;
                        showNotification({
                          title: "Message Updated",
                          message: `Message marked successfully as ${
                            mail.is_read ? "Unread" : "Read"
                          }. It may take up to 30 seconds for the change to be visible.`,
                        });
                        if (mutate) mutate();
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
                            Are you sure you want to delete this message? This
                            action cannot be undone.
                          </Text>
                        ),
                        onConfirm: () =>
                          void (async () => {
                            if (session?.user.id === undefined) {
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
                              session?.user.id,
                              mail.mail_id,
                            );
                            data.find(
                              (message) => message.mail_id === mail.mail_id,
                            )!.isDeleted = true;
                            showNotification({
                              title: "Message Deleted",
                              message: `Message deleted successfully. It may take up to 30 seconds for the change to be visible.`,
                            });
                            if (mutate) mutate();
                          })(),
                      });
                    }}
                  >
                    Delete Message
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          ),
        },
      ]}
      records={data.filter((mail) => !mail.isDeleted)}
    />
  );
}
