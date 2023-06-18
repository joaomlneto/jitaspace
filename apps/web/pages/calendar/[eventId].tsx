import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import {
  Badge,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdCalendarEventId,
  useGetCharactersCharacterIdCalendarEventIdAttendees,
  type GetCharactersCharacterIdCalendarEventIdAttendees200Item,
  type GetCharactersCharacterIdCalendarEventIdAttendees200ItemEventResponse,
} from "@jitaspace/esi-client";
import { CharacterAvatar, CharacterName, EveEntityAvatar } from "@jitaspace/ui";
import { toArrayIfNot } from "@jitaspace/utils";

import { MailMessageViewer } from "~/components/EveMail";
import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const eventId = parseInt(toArrayIfNot(router.query.eventId)[0] ?? "");
  const { characterId, isTokenValid } = useEsiClientContext();
  const { data: event, isLoading: eventLoading } =
    useGetCharactersCharacterIdCalendarEventId(
      characterId ?? 1,
      eventId,
      {},
      {
        swr: {
          enabled: isTokenValid,
        },
      },
    );
  const { data: attendees, isLoading: attendeesLoading } =
    useGetCharactersCharacterIdCalendarEventIdAttendees(
      characterId ?? 1,
      eventId,
      {},
      {
        swr: {
          enabled: isTokenValid,
        },
      },
    );

  const loading = eventLoading || attendeesLoading;

  const eventResponseColor: {
    [key in GetCharactersCharacterIdCalendarEventIdAttendees200ItemEventResponse]: string;
  } = {
    accepted: "green",
    tentative: "yellow",
    not_responded: "gray",
    declined: "red",
  };

  const sortedAttendees = [...(attendees?.data ?? [])].sort(
    (
      a: GetCharactersCharacterIdCalendarEventIdAttendees200Item,
      b: GetCharactersCharacterIdCalendarEventIdAttendees200Item,
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
    <Container size="xl">
      <Stack>
        <Group>
          <Title order={1}>Calendar</Title>
          {loading && <Loader />}
        </Group>
        <Title order={4}>{event?.data.title}</Title>
        <MailMessageViewer content={event?.data.text ?? ""} />
        <Group position="apart" mt="xl">
          <Text>Start</Text>
          <Text>
            {event?.data.date && new Date(event?.data.date).toLocaleString()}
          </Text>
        </Group>
        <Group position="apart">
          <Text>Duration</Text>
          <Text>{event?.data.duration} minutes</Text>
        </Group>
        <Group position="apart">
          <Text>Importance</Text>
          <Text>{event?.data.importance}</Text>
        </Group>
        <Group position="apart">
          <Text>Owner</Text>
          <Group noWrap>
            {/* FIXME: We know the type of this entity! */}
            {event?.data.owner_id && (
              <EveEntityAvatar entityId={event?.data.owner_id} size="sm" />
            )}{" "}
            <Text>{event?.data.owner_name}</Text>
          </Group>
        </Group>
        <Group position="apart">
          <Text>Response</Text>
          <Text>{event?.data.response}</Text>
        </Group>
        <Title order={4} mt="xl">
          Attendees
        </Title>
        <Stack>
          {sortedAttendees.map((attendee) => (
            <Group key={attendee.character_id} position="apart">
              <Group key={attendee.event_response} noWrap>
                <CharacterAvatar
                  characterId={attendee.character_id}
                  size="sm"
                  radius="xl"
                />
                <CharacterName characterId={attendee.character_id} />
              </Group>
              <Badge
                variant="light"
                color={eventResponseColor[attendee.event_response!]}
              >
                {attendee.event_response}
              </Badge>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

Page.requiredScopes = [
  "esi-calendar.read_calendar_events.v1",
  "esi-calendar.respond_calendar_events.v1",
];
