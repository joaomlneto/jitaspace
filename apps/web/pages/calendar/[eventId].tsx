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
import { NextSeo } from "next-seo";

import {
  useGetCharactersCharacterIdCalendarEventId,
  useGetCharactersCharacterIdCalendarEventIdAttendees,
  type GetCharactersCharacterIdCalendarEventIdAttendees200Item,
  type GetCharactersCharacterIdCalendarEventIdAttendees200ItemEventResponse,
} from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { CalendarIcon, WarningIcon } from "@jitaspace/eve-icons";
import {
  CalendarEventHumanDurationText,
  CalendarEventOwnerAvatar,
  CalendarEventResponseBadge,
  CharacterAnchor,
  CharacterAvatar,
  CharacterName,
  EveEntityNameAnchor,
  FormattedDateText,
} from "@jitaspace/ui";
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
    <>
      <NextSeo
        title={
          event?.data ? `${event?.data.title} | Calendar` : "Calendar event"
        }
      />
      <Container>
        <Stack>
          <Group>
            <CalendarIcon width={48} />
            <Title order={1}>Calendar</Title>
            {loading && <Loader />}
          </Group>
          <Title order={4}>
            {event?.data.importance === 1 && <WarningIcon width={32} />}
            {event?.data.title}
          </Title>
          <MailMessageViewer content={event?.data.text ?? ""} />
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
            <Text>Response</Text>
            <CalendarEventResponseBadge eventId={eventId} />
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
                  <CharacterAnchor characterId={attendee.character_id}>
                    <CharacterName span characterId={attendee.character_id} />
                  </CharacterAnchor>
                </Group>
                <Badge
                  variant="light"
                  color={
                    eventResponseColor[
                      attendee.event_response ?? "not_responded"
                    ]
                  }
                >
                  {attendee.event_response}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Stack>
      </Container>
    </>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

Page.requiredScopes = [
  "esi-calendar.read_calendar_events.v1",
  "esi-calendar.respond_calendar_events.v1",
];
