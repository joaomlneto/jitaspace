import React, { type ReactElement } from "react";
import Link from "next/link";
import {
  Anchor,
  Avatar,
  Center,
  Container,
  Group,
  Indicator,
  Loader,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { format } from "date-fns";
import { NextSeo } from "next-seo";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdCalendar,
  type GetCharactersCharacterIdCalendar200Item,
} from "@jitaspace/esi-client";
import { CalendarIcon, WarningIcon } from "@jitaspace/eve-icons";
import {
  CalendarEventAttendeesAvatarGroup,
  CalendarEventHumanDurationText,
  CalendarEventOwnerAvatar,
  CalendarEventOwnerName,
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
    <>
      <NextSeo title="Calendar" />
      <Container>
        <Stack spacing="xl">
          <Group>
            <CalendarIcon width={48} />
            <Title order={1}>Calendar</Title>
            {isLoading && <Loader />}
          </Group>
          <Center>
            <Calendar
              size="md"
              excludeDate={(date: Date) => {
                // return false if date is before today
                const startOfToday = new Date().setHours(0, 0, 0, 0);
                return date.getTime() < startOfToday;
              }}
              renderDay={(date: Date) => {
                const day = date.getDate();
                const dayEvents = eventsPerDate[date.getTime()] ?? [];
                return (
                  <Indicator
                    label={dayEvents.length}
                    size={16}
                    offset={-2}
                    disabled={dayEvents.length === 0}
                  >
                    <div>{day}</div>
                  </Indicator>
                );
              }}
            />
          </Center>
          {Object.keys(eventsPerDate).map((dateString) => {
            return (
              <Stack key={dateString}>
                <Title order={5}>
                  {format(new Date(parseInt(dateString)), "LLLL dd - EEEE")}
                </Title>
                <Table highlightOnHover striped>
                  <tbody>
                    {eventsPerDate[dateString]?.map((event) => (
                      <tr key={event.event_id}>
                        <td width={10}>
                          <Tooltip
                            label={
                              <CalendarEventHumanDurationText
                                eventId={event.event_id}
                              />
                            }
                          >
                            <Text>
                              {format(new Date(event.event_date ?? 0), "HH:mm")}
                            </Text>
                          </Tooltip>
                        </td>
                        <td>
                          <Group noWrap>
                            <Tooltip
                              label={
                                <CalendarEventOwnerName
                                  eventId={event.event_id}
                                />
                              }
                            >
                              <Avatar size="sm">
                                <CalendarEventOwnerAvatar
                                  eventId={event.event_id}
                                  size="sm"
                                />
                              </Avatar>
                            </Tooltip>
                            <Group noWrap spacing="xs">
                              {event.importance === 1 && (
                                <WarningIcon width={20} />
                              )}
                              <Anchor
                                component={Link}
                                href={`/calendar/${event.event_id}`}
                                lineClamp={1}
                              >
                                {event.title}
                              </Anchor>
                            </Group>
                          </Group>
                        </td>
                        <td align="right" width={1}>
                          <Group position="right">
                            <CalendarEventAttendeesAvatarGroup
                              eventId={event.event_id}
                              limit={5}
                              size="sm"
                              radius="xl"
                            />
                          </Group>
                        </td>
                        <td align="right" width={1}>
                          <CalendarEventResponseBadge
                            eventId={event.event_id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Stack>
            );
          })}
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
