import React from "react";
import { Badge, Group, Stack, Text, Title } from "@mantine/core";

import {
  GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponse,
  useGetCharactersCharacterIdCalendarEventId,
  useGetCharactersCharacterIdCalendarEventIdAttendees,
  type GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponseEventResponse,
} from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/hooks";
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
  eventId?: number;
};

export function CalendarEventDetailsPanel({
  eventId,
}: CalendarEventPanelProps) {
  const { characterId, isTokenValid, scopes, accessToken } =
    useEsiClientContext();
  const { data: event } = useGetCharactersCharacterIdCalendarEventId(
    characterId ?? 1,
    eventId ?? 1,
    { token: accessToken },
    {},
    {
      query: {
        enabled: isTokenValid && eventId !== undefined,
      },
    },
  );
  const { data: attendees } =
    useGetCharactersCharacterIdCalendarEventIdAttendees(
      characterId ?? 1,
      eventId ?? 1,
      { token: accessToken },
      {},
      {
        query: {
          enabled: isTokenValid && eventId !== undefined,
        },
      },
    );

  const canRespondToEvents = scopes.includes(
    "esi-calendar.respond_calendar_events.v1",
  );

  const eventResponseColor: {
    [key in GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponseEventResponse]: string;
  } = {
    accepted: "green",
    tentative: "yellow",
    not_responded: "gray",
    declined: "red",
  };

  const sortedAttendees = [...(attendees?.data ?? [])].sort(
    (
      a: GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponse[number],
      b: GetCharactersCharacterIdCalendarEventIdAttendeesQueryResponse[number],
    ) => {
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
        <CalendarEventHumanDurationText eventId={eventId} />
      </Group>
      <Group position="apart">
        <Text>Owner</Text>
        <Group noWrap>
          <CalendarEventOwnerAvatar eventId={eventId} size="sm" />
          <EveEntityNameAnchor entityId={event?.data.owner_id} />
        </Group>
      </Group>
      <Group position="apart">
        <Text>Your Response</Text>
        {canRespondToEvents ? (
          <CalendarEventAttendanceSelect eventId={eventId} size="xs" w={130} />
        ) : (
          <CalendarEventResponseBadge eventId={eventId} />
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
            <Group key={attendee.event_response} noWrap>
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
