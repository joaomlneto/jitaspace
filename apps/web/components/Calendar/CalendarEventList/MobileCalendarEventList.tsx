import type { TableProps } from "@mantine/core";
import { Anchor, Group, Stack, Table, Title } from "@mantine/core";
import { openContextModal } from "@mantine/modals";

import type { CalendarEvent } from "@jitaspace/hooks";
import { WarningIcon } from "@jitaspace/eve-icons";
import { DateHoverCard, FormattedDateText } from "@jitaspace/ui";

import { CalendarEventResponseBadge } from "~/components/Badge";

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
                {/* Owner and attendees are fetched per event (detail endpoint),
                    so they are shown in the details modal rather than per row. */}
                <Group justify="space-between" gap="xs">
                  <DateHoverCard date={new Date(event.event_date ?? 0)}>
                    <FormattedDateText
                      size="sm"
                      date={new Date(event.event_date ?? 0)}
                      format="HH:mm"
                    />
                  </DateHoverCard>
                  <CalendarEventResponseBadge
                    size="xs"
                    response={event.event_response}
                  />
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
