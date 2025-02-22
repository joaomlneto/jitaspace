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

import { CalendarIcon, WarningIcon } from "@jitaspace/eve-icons";
import {
  CalendarEventAttendee,
  CalendarEventAttendeeResponse,
  useCalendarEvent,
  useCalendarEventAttendees,
  useSelectedCharacter,
} from "@jitaspace/hooks";
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
  const character = useSelectedCharacter();
  const { data: event, isLoading: eventLoading } = useCalendarEvent(
    character?.characterId,
    eventId,
  );
  const { data: attendees, isLoading: attendeesLoading } =
    useCalendarEventAttendees(character?.characterId, eventId);

  const loading = eventLoading || attendeesLoading;

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
      return (eventResponseColor[a.event_response] ?? "").localeCompare(
        eventResponseColor[b.event_response] ?? "",
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
          <Group justify="space-between" mt="xl">
            <Text>When</Text>
            <FormattedDateText
              date={event?.data.date ? new Date(event?.data.date) : undefined}
              format="yyyy-MM-dd HH:mm"
            />
          </Group>
          <Group justify="space-between">
            <Text>Duration</Text>
            {character && (
              <CalendarEventHumanDurationText
                characterId={character.characterId}
                eventId={eventId}
              />
            )}
          </Group>
          <Group justify="space-between">
            <Text>Owner</Text>
            <Group wrap="nowrap">
              {character && (
                <CalendarEventOwnerAvatar
                  characterId={character.characterId}
                  eventId={eventId}
                  size="sm"
                />
              )}
              <EveEntityNameAnchor entityId={event?.data.owner_id} />
            </Group>
          </Group>
          <Group justify="space-between">
            <Text>Response</Text>
            {character && (
              <CalendarEventResponseBadge
                characterId={character.characterId}
                eventId={eventId}
              />
            )}
          </Group>
          <Title order={4} mt="xl">
            Attendees
          </Title>
          <Stack>
            {sortedAttendees.map((attendee) => (
              <Group key={attendee.character_id} justify="space-between">
                <Group key={attendee.event_response} wrap="nowrap">
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

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return <MainLayout>{page}</MainLayout>;
};

Page.requiredScopes = [
  "esi-calendar.read_calendar_events.v1",
  "esi-calendar.respond_calendar_events.v1",
];
