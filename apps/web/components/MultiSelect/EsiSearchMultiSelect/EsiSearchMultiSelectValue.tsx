import React, { forwardRef } from "react";
import { Badge, Group, type SelectItemProps } from "@mantine/core";

import { LabelName, MailLabelColorSwatch } from "@jitaspace/ui";

export const EmailLabelMultiSelectItem = forwardRef<
  HTMLDivElement,
  SelectItemProps & { unreadCount: number }
>(({ value, unreadCount, ...others }, ref) => {
  return (
    <Group ref={ref} {...others} position="apart" noWrap>
      <Group noWrap>
        <MailLabelColorSwatch labelId={value ?? 1} size={16} />
        <LabelName labelId={value} />
      </Group>
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
    </Group>
  );
});
EmailLabelMultiSelectItem.displayName = "EmailLabelMultiSelectItem";
