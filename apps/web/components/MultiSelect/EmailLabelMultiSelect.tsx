import React from "react";
import {
  Box,
  CloseButton,
  MultiSelect,
  rem,
  type MultiSelectProps,
  type MultiSelectValueProps,
} from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { LabelName, MailLabelColorSwatch } from "@jitaspace/ui";
import { humanLabelName } from "@jitaspace/utils";

import { EmailLabelMultiSelectItem } from "~/components/MultiSelect/EsiSearchMultiSelect";

type EmailLabelMultiSelectProps = Omit<MultiSelectProps, "data">;

export function EmailLabelMultiSelectValue({
  value,
  onRemove,
  ...others
}: Omit<MultiSelectValueProps, "value"> & {
  value: string | number;
}) {
  return (
    <div {...others}>
      <Box
        sx={(theme) => ({
          display: "flex",
          cursor: "default",
          alignItems: "center",
          backgroundColor:
            theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
          border: `${rem(1)} solid ${
            theme.colorScheme === "dark"
              ? theme.colors.dark[7]
              : theme.colors.gray[4]
          }`,
          paddingLeft: theme.spacing.xs,
          borderRadius: theme.radius.sm,
        })}
      >
        <MailLabelColorSwatch labelId={value ?? 1} size={16} mr={10} />
        <LabelName sx={{ lineHeight: 1, fontSize: rem(12) }} labelId={value} />

        <CloseButton
          onMouseDown={onRemove}
          variant="transparent"
          size={22}
          iconSize={14}
          tabIndex={-1}
        />
      </Box>
    </div>
  );
}

export function EmailLabelMultiSelect(props: EmailLabelMultiSelectProps) {
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
    <MultiSelect
      label="Labels"
      clearable
      data={
        labels?.data.labels?.map((label) => ({
          value: `${label.label_id}`,
          label: humanLabelName(label),
          unreadCount: label.unread_count ?? 0,
        })) ?? []
      }
      itemComponent={EmailLabelMultiSelectItem}
      valueComponent={EmailLabelMultiSelectValue}
      //placeholder="Choose labels"
      {...props}
    />
  );
}
