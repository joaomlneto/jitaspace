import _React, { memo } from "react";
import {
  Badge,
  Group,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { IconClipboard, IconClipboardCheck } from "@tabler/icons-react";

import { TypeAnchor, TypeAvatar, TypeName } from "@jitaspace/ui";





interface ShipFittingCardHeaderProps {
  fitString?: string;
  shipName?: string;
  shipTypeId?: number;
  tags?: string[];
}

export const ShipFittingCardHeader = memo(
  ({ fitString, shipTypeId, shipName, tags }: ShipFittingCardHeaderProps) => {
    const clipboard = useClipboard({ timeout: 2000 });
    return (
      <Group justify="space-between" p="xs">
        <Group wrap="nowrap">
          <TypeAvatar typeId={shipTypeId} size="md" variation="icon" />
          <div>
            <Text fw={500} lineClamp={1}>
              {shipName}
            </Text>
            <TypeAnchor typeId={shipTypeId} target="_blank">
              <TypeName typeId={shipTypeId} size="xs" />
            </TypeAnchor>
          </div>
        </Group>
        <Group>
          {tags?.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
          {fitString ? (
            <Tooltip
              label={clipboard.copied ? "Copied!" : "Copy to clipboard"}
              position="left"
              withArrow
            >
              <UnstyledButton>
                <ThemeIcon
                  variant="light"
                  color="primary"
                  radius="xl"
                  size="sm"
                  onClick={() => fitString && clipboard.copy(fitString.trim())}
                >
                  {clipboard.copied ? (
                    <IconClipboardCheck />
                  ) : (
                    <IconClipboard />
                  )}
                </ThemeIcon>
              </UnstyledButton>
            </Tooltip>
          ) : null}
        </Group>
      </Group>
    );
  },
);
ShipFittingCardHeader.displayName = "ShipFittingCardHeader";
