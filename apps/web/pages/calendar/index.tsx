import React, { type ReactElement } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Center,
  Container,
  Group,
  Indicator,
  JsonInput,
  Loader,
  Stack,
  Table,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { IconExclamationCircle } from "@tabler/icons-react";
import { useSession } from "next-auth/react";

import {
  useGetCharactersCharacterIdCalendar,
  type GetCharactersCharacterIdCalendarEventIdAttendees200ItemEventResponse,
} from "@jitaspace/esi-client";

import { MainLayout } from "~/layout";

export default function Page() {
  const { data: session } = useSession();
  const { data: events, isLoading } = useGetCharactersCharacterIdCalendar(
    session?.user?.id ?? 1,
    {},
    {
      swr: {
        enabled: !!session?.user?.id,
      },
    },
  );

  const eventsPerDate: { [date: string]: any[] } = {};
  if (events) {
    events.data.forEach((event) => {
      const date = new Date(event.event_date!);
      date.setHours(0, 0, 0, 0);
      const dateString = date.getTime();
      if (!eventsPerDate[dateString]) {
        eventsPerDate[dateString] = [];
      }
      eventsPerDate[dateString]!.push(event);
    });
  }

  const eventResponseColor: {
    [key in GetCharactersCharacterIdCalendarEventIdAttendees200ItemEventResponse]: string;
  } = {
    accepted: "green",
    tentative: "yellow",
    not_responded: "gray",
    declined: "red",
  };

  return (
    <Container>
      <Stack spacing="xl">
        <Group>
          <Title order={1}>Calendar</Title>
          {isLoading && <Loader />}
        </Group>
        {false && (
          <JsonInput
            value={JSON.stringify(
              events?.data.map((event) => ({
                ...event,
                title: "<REDACTED>",
                event_id: "<REDACTED>",
              })) ?? [],
              null,
              2,
            )}
            readOnly
            maxRows={20}
            autosize
          />
        )}
        {false && (
          <JsonInput
            value={JSON.stringify(eventsPerDate, null, 2)}
            readOnly
            maxRows={20}
            autosize
          />
        )}
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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                (event) => event.event_response === "tentative",
              );
              return (
                <Indicator
                  label={dayEvents.length}
                  //size={8}
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
                  <Group noWrap align="end" spacing="xs">
                    {event.importance === 1 && (
                      <ThemeIcon
                        color="red"
                        variant="light"
                        radius="xl"
                        size="sm"
                      >
                        <IconExclamationCircle />
                      </ThemeIcon>
                    )}
                    <Anchor
                      component={Link}
                      href={`/calendar/${event.event_id}`}
                    >
                      {event.title}
                    </Anchor>
                  </Group>
                </td>
                <td>{new Date(event.event_date!).toLocaleString()}</td>
                <td>
                  <Badge
                    color={eventResponseColor[event.event_response!]}
                    variant="light"
                  >
                    {event.event_response}
                  </Badge>
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