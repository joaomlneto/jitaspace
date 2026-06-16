import { Badge, Group, Stack, Text, Title } from "@mantine/core";

import type {
  CalendarEventAttendee,
  CalendarEventAttendeeResponse,
} from "@jitaspace/hooks";
import {
  CharacterAnchor,
  CharacterName,
  EveEntityNameAnchor,
} from "@jitaspace/eve-components";
import { useCalendarEvent, useCalendarEventAttendees } from "@jitaspace/hooks";
import {
  CharacterAvatar,
  DateHoverCard,
  FormattedDateText,
} from "@jitaspace/ui";

import { CalendarEventOwnerAvatar } from "~/components/Avatar";
import { CalendarEventResponseBadge } from "~/components/Badge";
import { CalendarEventHumanDurationText } from "~/components/DurationText";
import { MailMessageViewer } from "~/components/EveMail/MailMessageViewer";
import { CalendarEventAttendanceSelect } from "~/components/Select";

export interface CalendarEventPanelProps {
  characterId: number;
  eventId: number;
}

export function CalendarEventDetailsPanel({
  characterId,
  eventId,
}: Readonly<CalendarEventPanelProps>) {
  const { data: event, canRespondToEvents } = useCalendarEvent(
    characterId,
    eventId,
  );
  const { data: attendees } = useCalendarEventAttendees(characterId, eventId);

  const eventResponseColor = (key: CalendarEventAttendeeResponse) => {
    switch (key) {
      case "accepted":
        return "green";
      case "tentative":
        return "yellow";
      case "not_responded":
        return "gray";
      case "declined":
        return "red";
      default:
        return "gray"; // Fallback for any unexpected values
    }
  };

  const sortedAttendees = [...(attendees?.data ?? [])].sort(
    (a: CalendarEventAttendee, b: CalendarEventAttendee) => {
      if (!a.event_response) {
        return 1;
      }
      if (!b.event_response) {
        return -1;
      }
      return eventResponseColor(a.event_response).localeCompare(
        eventResponseColor(b.event_response),
      );
    },
  );

  return (
    <Stack>
      <Group justify="space-between" mt="xl">
        <Text>When</Text>
        <DateHoverCard
          date={event?.data.date ? new Date(event?.data.date) : undefined}
        >
          <FormattedDateText
            date={event?.data.date ? new Date(event?.data.date) : undefined}
            format="yyyy-MM-dd HH:mm"
          />
        </DateHoverCard>
      </Group>
      <Group justify="space-between">
        <Text>Duration</Text>
        <CalendarEventHumanDurationText
          characterId={characterId}
          eventId={eventId}
        />
      </Group>
      <Group justify="space-between">
        <Text>Owner</Text>
        <Group wrap="nowrap">
          <CalendarEventOwnerAvatar
            characterId={characterId}
            eventId={eventId}
            size="sm"
          />
          <EveEntityNameAnchor entityId={event?.data.owner_id} />
        </Group>
      </Group>
      <Group justify="space-between">
        <Text>Your Response</Text>
        {canRespondToEvents ? (
          <CalendarEventAttendanceSelect
            characterId={characterId}
            eventId={eventId}
            size="xs"
            w={130}
          />
        ) : (
          <CalendarEventResponseBadge
            characterId={characterId}
            eventId={eventId}
          />
        )}
      </Group>
      {event?.data.text && (
        <MailMessageViewer content={event?.data.text ?? ""} />
      )}
      <Title order={4} mt="xl">
        Attendees
      </Title>
      <Stack>
        {sortedAttendees.map((attendee) => (
          <Group key={attendee.character_id} justify="space-between">
            <Group key={attendee.event_response} wrap="nowrap">
              <CharacterAvatar characterId={attendee.character_id} size="sm" />
              <CharacterAnchor characterId={attendee.character_id}>
                <CharacterName span characterId={attendee.character_id} />
              </CharacterAnchor>
            </Group>
            <Badge
              variant="light"
              color={eventResponseColor(
                attendee.event_response ?? "not_responded",
              )}
            >
              {attendee.event_response}
            </Badge>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}
