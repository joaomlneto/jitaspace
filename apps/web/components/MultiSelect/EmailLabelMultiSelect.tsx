import React, { forwardRef } from "react";
import {
  Badge,
  Box,
  CloseButton,
  Group,
  MultiSelect,
  rem,
  type MultiSelectProps,
  type MultiSelectValueProps,
  type SelectItemProps,
} from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { LabelName } from "@jitaspace/ui";
import { humanLabelName } from "@jitaspace/utils";

import { MailLabelIcon } from "~/components/Icon";

type EmailLabelMultiSelectProps = Omit<MultiSelectProps, "data">;

export const EmailLabelMultiSelectItem = forwardRef<
  HTMLDivElement,
  SelectItemProps & { unreadCount: number }
>(({ value, unreadCount, ...others }, ref) => {
  return (
    <Group ref={ref} {...others} position="apart" noWrap>
      <Group noWrap>
        <MailLabelIcon labelId={value ?? 1} size={16} />
        <LabelName labelId={value} />
      </Group>
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
    </Group>
  );
});
EmailLabelMultiSelectItem.displayName = "EmailLabelMultiSelectItem";

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
        <MailLabelIcon labelId={value ?? 1} size={16} mr={10} />
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