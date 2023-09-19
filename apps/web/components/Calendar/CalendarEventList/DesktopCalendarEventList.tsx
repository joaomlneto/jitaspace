import React from "react";
import {
  Anchor,
  Avatar,
  Group,
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

export function DesktopCalendarEventList({
  events,
  ...otherProps
}: EventListProps) {
  return (
    <Table {...otherProps}>
      <tbody>
        {events.map((event) => (
          <tr key={event.event_id}>
            <td width={10}>
              <Tooltip
                label={
                  <CalendarEventHumanDurationText eventId={event.event_id} />
                }
              >
                <Text>
                  <FormattedDateText
                    date={new Date(event.event_date ?? 0)}
                    format="HH:mm"
                  />
                </Text>
              </Tooltip>
            </td>
            <td>
              <Group wrap="nowrap">
                <Tooltip
                  label={<CalendarEventOwnerName eventId={event.event_id} />}
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
              </Group>
            </td>
            <td align="right" width={1}>
              <Group position="right">
                <CalendarEventAttendeesAvatarGroup
                  eventId={event.event_id}
                  limit={5}
                  size="sm"
                  radius="xl"
                />
              </Group>
            </td>
            <td align="right" width={1}>
              <CalendarEventResponseBadge w={130} eventId={event.event_id} />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
