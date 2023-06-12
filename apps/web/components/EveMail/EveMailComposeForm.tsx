import React from "react";
import {
  Alert,
  Anchor,
  Button,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { HttpStatusCode, type AxiosError } from "axios";
import { useSession } from "next-auth/react";

import { postCharactersCharacterIdMail } from "@jitaspace/esi-client";

import { MailMessageEditor } from "~/components/EveMail/MailMessageEditor";
import { EmailRecipientSearchMultiSelect } from "~/components/MultiSelect";

export type EveMailComposeFormProps = {
  onSend?: () => void;
};

export function EveMailComposeForm({ onSend }: EveMailComposeFormProps) {
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

  const handleSend = async (values: typeof form.values) => {
    console.log("values:", values);
    try {
      if (!session?.user.id) {
        return showNotification({
          message: "Not logged in",
        });
      }
      const result = await postCharactersCharacterIdMail(session.user.id, {
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
        onSend?.();
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
                onSend?.();
              }
            })();
          },
          onClose() {
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
    <form
      onSubmit={form.onSubmit((values) => {
        form.validate();
        if (form.isValid()) void handleSend(values);
      })}
    >
      <Stack>
        <Grid align="end">
          <Grid.Col span="auto">
            <TextInput
              label="Subject"
              placeholder="What is this all about?"
              {...form.getInputProps("subject")}
            />
          </Grid.Col>
          <Grid.Col span="content">
            <Button type="submit">Send</Button>
          </Grid.Col>
        </Grid>
        <Container>{JSON.stringify(form.values.recipients)}</Container>
        <EmailRecipientSearchMultiSelect
          label="Recipients"
          value={form.values.recipients}
          onChange={(value) => {
            console.log("RECIPIENTS CHANGED TO", value);
            form.setFieldValue("recipients", value);
          }}
        />
        <Stack spacing={0}>
          <MailMessageEditor
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
  );
}
