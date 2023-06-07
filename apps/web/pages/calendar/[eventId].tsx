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
import { useSession } from "next-auth/react";

import {
  useGetCharactersCharacterIdCalendarEventId,
  useGetCharactersCharacterIdCalendarEventIdAttendees,
  type GetCharactersCharacterIdCalendarEventIdAttendees200Item,
  type GetCharactersCharacterIdCalendarEventIdAttendees200ItemEventResponse,
} from "@jitaspace/esi-client";
import { CharacterAvatar, CharacterName, EveEntityAvatar } from "@jitaspace/ui";

import { MainLayout } from "~/layout";

export default function Page() {
  const router = useRouter();
  const eventId = parseInt(router.query.eventId as string);
  const { data: session } = useSession();
  const { data: event, isLoading: eventLoading } =
    useGetCharactersCharacterIdCalendarEventId(
      session?.user?.id ?? 1,
      eventId,
      {},
      {
        swr: {
          enabled: !!session?.user?.id,
        },
      },
    );
  const { data: attendees, isLoading: attendeesLoading } =
    useGetCharactersCharacterIdCalendarEventIdAttendees(
      session?.user?.id ?? 1,
      eventId,
      {},
      {
        swr: {
          enabled: !!session?.user?.id,
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
            <EveEntityAvatar id={event?.data.owner_id} size="sm" />{" "}
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
                <CharacterName characterId={attendee.character_id!} />
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
        <div dangerouslySetInnerHTML={{ __html: event?.data.text ?? "" }} />
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
