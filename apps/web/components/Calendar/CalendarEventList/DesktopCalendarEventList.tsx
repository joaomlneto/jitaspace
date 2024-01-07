import {WarningIcon} from "@jitaspace/eve-icons";
import {CalendarEvent} from "@jitaspace/hooks";
import {
  CalendarEventAttendeesAvatarGroup,
  CalendarEventHumanDurationText,
  CalendarEventOwnerAnchor,
  CalendarEventOwnerAvatar,
  CalendarEventOwnerName,
  CalendarEventResponseBadge,
  FormattedDateText,
} from "@jitaspace/ui";
import {Anchor, Avatar, Group, Table, type TableProps, Text, Title, Tooltip,} from "@mantine/core";
import {openContextModal} from "@mantine/modals";
import React from "react";

type EventListProps = TableProps & {
  characterId: number;
  events: CalendarEvent[];
};

export function DesktopCalendarEventList({
                                           characterId,
                                           events,
                                           ...otherProps
                                         }: EventListProps) {
  return (
    <Table {...otherProps}>
      <Table.Tbody>
        {events.map((event) => (
          <Table.Tr key={event.event_id}>
            <Table.Td width={10}>
              <Tooltip
                label={
                  <CalendarEventHumanDurationText
                    characterId={characterId}
                    eventId={event.event_id}
                  />
                }
              >
                <Text>
                  <FormattedDateText
                    date={new Date(event.event_date ?? 0)}
                    format="HH:mm"
                  />
                </Text>
              </Tooltip>
            </Table.Td>
            <Table.Td>
              <Group wrap="nowrap">
                <Tooltip
                  label={
                    <CalendarEventOwnerName
                      characterId={characterId}
                      eventId={event.event_id}
                    />
                  }
                >
                  <Avatar size="sm">
                    <CalendarEventOwnerAnchor
                      characterId={characterId}
                      eventId={event.event_id}
                    >
                      <CalendarEventOwnerAvatar
                        characterId={characterId}
                        eventId={event.event_id}
                        size="sm"
                      />
                    </CalendarEventOwnerAnchor>
                  </Avatar>
                </Tooltip>
                <Group wrap="nowrap" gap="xs">
                  {event.importance === 1 && <WarningIcon width={20}/>}
                  <Anchor
                    lineClamp={1}
                    onClick={() => {
                      if (event.event_id) {
                        openContextModal({
                          modal: "viewCalendarEvent",
                          title: (
                            <Title order={4}>
                              {event.importance === 1 && (
                                <WarningIcon width={32}/>
                              )}
                              {event.title}
                            </Title>
                          ),
                          size: "lg",
                          innerProps: {characterId, eventId: event.event_id},
                        });
                      }
                    }}
                  >
                    {event.title}
                  </Anchor>
                </Group>
              </Group>
            </Table.Td>
            <Table.Td align="right" width={1}>
              <Group justify="flex-end">
                <CalendarEventAttendeesAvatarGroup
                  characterId={characterId}
                  eventId={event.event_id}
                  limit={5}
                  size="sm"
                  radius="xl"
                />
              </Group>
            </Table.Td>
            <Table.Td align="right" width={1}>
              <CalendarEventResponseBadge
                characterId={characterId}
                w={130}
                eventId={event.event_id}
              />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
