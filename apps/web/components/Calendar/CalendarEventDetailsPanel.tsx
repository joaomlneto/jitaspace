import React from "react";
import { Badge, Group, Stack, Text, Title } from "@mantine/core";

import {
  CalendarEventAttendee,
  CalendarEventAttendeeResponse,
  useCalendarEvent,
  useCalendarEventAttendees,
} from "@jitaspace/hooks";
import {
  CalendarEventAttendanceSelect,
  CalendarEventHumanDurationText,
  CalendarEventOwnerAvatar,
  CalendarEventResponseBadge,
  CharacterAnchor,
  CharacterAvatar,
  CharacterName,
  EveEntityNameAnchor,
  FormattedDateText,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail/MailMessageViewer";

export type CalendarEventPanelProps = {
  characterId: number;
  eventId: number;
};

export function CalendarEventDetailsPanel({
  characterId,
  eventId,
}: CalendarEventPanelProps) {
  const { data: event, canRespondToEvents } = useCalendarEvent(
    characterId,
    eventId,
  );
  const { data: attendees } = useCalendarEventAttendees(characterId, eventId);

  const eventResponseColor: {
    [key in CalendarEventAttendeeResponse]: string;
  } = {
    accepted: "green",
    tentative: "yellow",
    not_responded: "gray",
    declined: "red",
  };

  const sortedAttendees = [...(attendees?.data ?? [])].sort(
    (a: CalendarEventAttendee, b: CalendarEventAttendee) => {
      if (!a.event_response) {
        return 1;
      }
      if (!b.event_response) {
        return -1;
      }
      return eventResponseColor[a.event_response].localeCompare(
        eventResponseColor[b.event_response],
      );
    },
  );

  return (
    <Stack>
      <Group position="apart" mt="xl">
        <Text>When</Text>
        <FormattedDateText
          date={event?.data.date ? new Date(event?.data.date) : undefined}
          format="yyyy-MM-dd HH:mm"
        />
      </Group>
      <Group position="apart">
        <Text>Duration</Text>
        <CalendarEventHumanDurationText
          characterId={characterId}
          eventId={eventId}
        />
      </Group>
      <Group position="apart">
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
      <Group position="apart">
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
          <Group key={attendee.character_id} position="apart">
            <Group key={attendee.event_response} wrap="nowrap">
              <CharacterAvatar characterId={attendee.character_id} size="sm" />
              <CharacterAnchor characterId={attendee.character_id}>
                <CharacterName span characterId={attendee.character_id} />
              </CharacterAnchor>
            </Group>
            <Badge
              variant="light"
              color={
                eventResponseColor[attendee.event_response ?? "not_responded"]
              }
            >
              {attendee.event_response}
            </Badge>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}
