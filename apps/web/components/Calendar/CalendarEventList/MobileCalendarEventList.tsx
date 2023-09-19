import React from "react";
import {
  Anchor,
  Avatar,
  Group,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
  type TableProps,
} from "@mantine/core";
import { openContextModal } from "@mantine/modals";

import { type GetCharactersCharacterIdCalendar200Item } from "@jitaspace/esi-client";
import { WarningIcon } from "@jitaspace/eve-icons";
import {
  CalendarEventAttendeesAvatarGroup,
  CalendarEventHumanDurationText,
  CalendarEventOwnerAnchor,
  CalendarEventOwnerAvatar,
  CalendarEventOwnerName,
  CalendarEventResponseBadge,
  FormattedDateText,
} from "@jitaspace/ui";

type EventListProps = TableProps & {
  events: GetCharactersCharacterIdCalendar200Item[];
};

export function MobileCalendarEventList({
  events,
  ...otherProps
}: EventListProps) {
  return (
    <Table {...otherProps}>
      <tbody>
        {events.map((event) => (
          <tr key={event.event_id}>
            <td>
              <Stack>
                <Group position="apart" gap="xs">
                  <Group>
                    <Tooltip
                      label={
                        <CalendarEventHumanDurationText
                          eventId={event.event_id}
                        />
                      }
                    >
                      <Text>
                        <FormattedDateText
                          size="sm"
                          date={new Date(event.event_date ?? 0)}
                          format="HH:mm"
                        />
                      </Text>
                    </Tooltip>
                    <Tooltip
                      label={
                        <CalendarEventOwnerName eventId={event.event_id} />
                      }
                    >
                      <Avatar size="sm">
                        <CalendarEventOwnerAnchor eventId={event.event_id}>
                          <CalendarEventOwnerAvatar
                            eventId={event.event_id}
                            size="sm"
                          />
                        </CalendarEventOwnerAnchor>
                      </Avatar>
                    </Tooltip>
                  </Group>
                  <Group position="right">
                    <CalendarEventAttendeesAvatarGroup
                      eventId={event.event_id}
                      limit={3}
                      size="sm"
                      radius="xl"
                    />
                    <CalendarEventResponseBadge
                      size="xs"
                      eventId={event.event_id}
                    />
                  </Group>
                </Group>
                <Group wrap="nowrap" gap="xs">
                  {event.importance === 1 && <WarningIcon width={20} />}
                  <Anchor
                    lineClamp={1}
                    onClick={() =>
                      openContextModal({
                        modal: "viewCalendarEvent",
                        title: (
                          <Title order={4}>
                            {event.importance === 1 && (
                              <WarningIcon width={32} />
                            )}
                            {event.title}
                          </Title>
                        ),
                        size: "lg",
                        innerProps: { eventId: event.event_id },
                      })
                    }
                  >
                    {event.title}
                  </Anchor>
                </Group>
              </Stack>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
