import React, { type ReactElement } from "react";
import Link from "next/link";
import {
  Anchor,
  Center,
  Container,
  Group,
  Indicator,
  Loader,
  Stack,
  Table,
  Title,
  Tooltip,
} from "@mantine/core";
import { Calendar } from "@mantine/dates";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdCalendar,
  type GetCharactersCharacterIdCalendar200Item,
} from "@jitaspace/esi-client";
import { CalendarIcon, WarningIcon } from "@jitaspace/eve-icons";
import {
  CalendarEventOwnerAvatar,
  CalendarEventResponseBadge,
} from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const { characterId, isTokenValid } = useEsiClientContext();
  const { data: events, isLoading } = useGetCharactersCharacterIdCalendar(
    characterId ?? 1,
    {},
    {
      swr: {
        enabled: isTokenValid,
      },
    },
  );

  const eventsPerDate: {
    [date: string]: GetCharactersCharacterIdCalendar200Item[];
  } = {};
  if (events) {
    events.data.forEach((event) => {
      if (!event.event_date) return;
      const date = new Date(event.event_date);
      date.setHours(0, 0, 0, 0);
      const dateString = date.getTime();
      if (!eventsPerDate[dateString]) {
        eventsPerDate[dateString] = [];
      }
      eventsPerDate[dateString]?.push(event);
    });
  }

  return (
    <Container>
      <Stack spacing="xl">
        <Group>
          <CalendarIcon width={48} />
          <Title order={1}>Calendar</Title>
          {isLoading && <Loader />}
        </Group>
        <Center>
          <Calendar
            size="xl"
            excludeDate={(date: Date) => {
              // return false if date is before today
              const startOfToday = new Date().setHours(0, 0, 0, 0);
              return date.getTime() < startOfToday;
            }}
            renderDay={(date: Date) => {
              const day = date.getDate();
              const dayEvents = eventsPerDate[date.getTime()] ?? [];
              const hasUnrespondedEvents = dayEvents.some(
                (event) => event.event_response === "tentative",
              );
              return (
                <Indicator
                  label={dayEvents.length}
                  size={16}
                  color={hasUnrespondedEvents ? "red" : "green"}
                  offset={-2}
                  disabled={dayEvents.length === 0}
                >
                  <div>{day}</div>
                </Indicator>
              );
            }}
          />
        </Center>
        <Table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Response</th>
            </tr>
          </thead>
          <tbody>
            {events?.data?.map((event) => (
              <tr key={event.event_id}>
                <td>
                  <Group>
                    <Tooltip label={"THIS IS THE END OF THE WORLD"}>
                      <CalendarEventOwnerAvatar
                        eventId={event.event_id}
                        size="sm"
                      />
                    </Tooltip>
                    <Group noWrap spacing="xs">
                      {event.importance === 1 && <WarningIcon width={20} />}
                      <Anchor
                        component={Link}
                        href={`/calendar/${event.event_id}`}
                      >
                        {event.title}
                      </Anchor>
                    </Group>
                  </Group>
                </td>
                <td>
                  {event.event_date &&
                    new Date(event.event_date).toLocaleString()}
                </td>
                <td>
                  <CalendarEventResponseBadge eventId={event.event_id} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
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
