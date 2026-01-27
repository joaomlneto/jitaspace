import type { TableProps } from "@mantine/core";
import { Anchor, Group, Stack, Table, Title, Tooltip } from "@mantine/core";
import { openContextModal } from "@mantine/modals";

import type { CalendarEvent } from "@jitaspace/hooks";
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
  characterId: number;
  events: CalendarEvent[];
};

export function MobileCalendarEventList({
  characterId,
  events,
  ...otherProps
}: EventListProps) {
  return (
    <Table {...otherProps}>
      <Table.Tbody>
        {events.map((event) => (
          <Table.Tr key={event.event_id}>
            <Table.Td>
              <Stack>
                <Group justify="space-between" gap="xs">
                  <Group>
                    <Tooltip
                      label={
                        <CalendarEventHumanDurationText
                          characterId={characterId}
                          eventId={event.event_id}
                        />
                      }
                    >
                      <FormattedDateText
                        size="sm"
                        date={new Date(event.event_date ?? 0)}
                        format="HH:mm"
                      />
                    </Tooltip>
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
                  </Group>
                  <Group justify="flex-end">
                    <CalendarEventAttendeesAvatarGroup
                      characterId={characterId}
                      eventId={event.event_id}
                      limit={3}
                      size="sm"
                      radius="xl"
                    />
                    <CalendarEventResponseBadge
                      characterId={characterId}
                      size="xs"
                      eventId={event.event_id}
                    />
                  </Group>
                </Group>
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
              </Stack>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
