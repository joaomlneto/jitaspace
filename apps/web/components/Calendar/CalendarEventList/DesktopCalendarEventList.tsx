import type { TableProps } from "@mantine/core";
import { Anchor, Group, Table, Title } from "@mantine/core";
import { openContextModal } from "@mantine/modals";

import type { CalendarEvent } from "@jitaspace/hooks";
import { WarningIcon } from "@jitaspace/eve-icons";
import { DateHoverCard, FormattedDateText } from "@jitaspace/ui";

import { CalendarEventOwnerAnchor } from "~/components/Anchor";
import { CalendarEventOwnerAvatar } from "~/components/Avatar";
import { CalendarEventAttendeesAvatarGroup } from "~/components/AvatarGroup";
import { CalendarEventResponseBadge } from "~/components/Badge";
import { CalendarEventHumanDurationText } from "~/components/DurationText";
import { CalendarEventOwnerName } from "~/components/Text";

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
              <DateHoverCard date={new Date(event.event_date ?? 0)}>
                <FormattedDateText
                  size="sm"
                  date={new Date(event.event_date ?? 0)}
                  format="HH:mm"
                />
              </DateHoverCard>
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
                  <div>
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
                  </div>
                </Tooltip>
                <Group wrap="nowrap" gap="xs">
                  {event.importance === 1 && <WarningIcon width={20} />}
                  <Anchor
                    size="sm"
                    lineClamp={1}
                    onClick={() => {
                      if (event.event_id) {
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
                          innerProps: { characterId, eventId: event.event_id },
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
                size="sm"
                variant="subtle"
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
