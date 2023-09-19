import React, { type ReactElement } from "react";
import {
  Button,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { openModal } from "@mantine/modals";
import { format } from "date-fns";
import { NextSeo } from "next-seo";

import { type GetCharactersCharacterIdCalendar200Item } from "@jitaspace/esi-client";
import { useCharacterCalendar } from "@jitaspace/esi-hooks";
import { CalendarIcon } from "@jitaspace/eve-icons";

import { CalendarEventList } from "~/components/Calendar/CalendarEventList/CalendarEventList";
import EventsCalendar from "~/components/Calendar/EventsCalendar";
import { MainLayout } from "~/layouts";

export default function Page() {
  const { events, isLoading, isValidating, hasMoreEvents, loadMoreEvents } =
    useCharacterCalendar();

  const eventsPerDate: {
    [date: string]: GetCharactersCharacterIdCalendar200Item[];
  } = {};
  if (events) {
    events.forEach((event) => {
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
    <>
      <NextSeo title="Calendar" />
      <Container>
        <Stack gap="xl">
          <Group justify="apart">
            <Group>
              <CalendarIcon width={48} />
              <Title order={1}>Calendar</Title>
              {isLoading && <Loader />}
            </Group>
            <Button
              size="xs"
              onClick={() =>
                openModal({
                  title: "Calendar View",
                  size: "md",
                  children: (
                    <Center>
                      {/* FIXME MANTINE V7 MIGRATION */}
                      <EventsCalendar events={events} size="xl" />
                      <EventsCalendar events={events} size="sm" />
                    </Center>
                  ),
                })
              }
            >
              Calendar View
            </Button>
          </Group>
          {Object.keys(eventsPerDate).map((dateString) => {
            return (
              <Stack key={dateString}>
                <Title order={5}>
                  {format(new Date(parseInt(dateString)), "LLLL dd - EEEE")}
                </Title>
                <CalendarEventList
                  events={eventsPerDate[dateString] ?? []}
                  highlightOnHover
                />
              </Stack>
            );
          })}
        </Stack>
        <Container my="xl">
          {hasMoreEvents && (
            <Button w="100%" onClick={loadMoreEvents}>
              Load more events
            </Button>
          )}
          {(isLoading || isValidating) && !hasMoreEvents && (
            <Group wrap="nowrap">
              <Loader size="sm" />
              <Text>Loading events</Text>
            </Group>
          )}
          {!isLoading && !isValidating && !hasMoreEvents && (
            <Center>
              <Text color="dimmed">No more events</Text>
            </Center>
          )}
        </Container>
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
