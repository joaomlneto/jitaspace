import { memo, useEffect, useState } from "react";
import { Loader, Select, type SelectProps } from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";

import {
  putCharactersCharacterIdCalendarEventId,
  putCharactersCharacterIdCalendarEventIdMutationRequestResponse,
  PutCharactersCharacterIdCalendarEventIdMutationRequestResponse,
  useGetCharactersCharacterIdCalendarEventId,
} from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";





export type CalendarEventAttendanceSelect = Omit<SelectProps, "data"> & {
  characterId: number;
  eventId?: string | number;
};
export const CalendarEventAttendanceSelect = memo(
  ({ characterId, eventId, ...otherProps }: CalendarEventAttendanceSelect) => {
    const [value, setValue] =
      useState<PutCharactersCharacterIdCalendarEventIdMutationRequestResponse | null>(
        (otherProps.value as PutCharactersCharacterIdCalendarEventIdMutationRequestResponse) ??
          null,
      );

    const { character, accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-calendar.read_calendar_events.v1"],
    });

    const { data: event, isLoading } =
      useGetCharactersCharacterIdCalendarEventId(
        characterId ?? 0,
        typeof eventId === "string" ? parseInt(eventId) : eventId ?? 0,
        {},
        { ...authHeaders },
        {
          query: {
            enabled: !!eventId && accessToken !== null,
          },
        },
      );

    const canRespondToEvents =
      character?.accessTokenPayload.scp.includes(
        "esi-calendar.respond_calendar_events.v1",
      ) ?? false;

    useEffect(() => {
      if (value === null && event?.data.response) {
        setValue(
          event.data
            .response as PutCharactersCharacterIdCalendarEventIdMutationRequestResponse,
        );
      }
    }, [event, value]);

    const values = Object.values(
      putCharactersCharacterIdCalendarEventIdMutationRequestResponse,
    ).map((value) => ({
      value,
      label:
        value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " "),
    }));

    return (
      <Select
        readOnly={!canRespondToEvents}
        rightSection={isLoading ? <Loader size="xs" /> : undefined}
        data={values}
        value={value}
        placeholder={"Not responded"}
        clearable={false}
        onChange={(newValue: string | null, option) => {
          if (value === newValue) return;
          if (!canRespondToEvents) return;
          if (newValue === null) return;
          if (
            !Object.keys(
              putCharactersCharacterIdCalendarEventIdMutationRequestResponse,
            ).includes(newValue)
          )
            return;
          openConfirmModal({
            title: "Are you sure?",
            children: `This will mark event ${event?.data.title} as ${newValue}.`,
            labels: { confirm: "Confirm", cancel: "Cancel" },
            onConfirm: () => {
              setValue(
                newValue as PutCharactersCharacterIdCalendarEventIdMutationRequestResponse,
              );
              otherProps.onChange?.(newValue, option);
              void putCharactersCharacterIdCalendarEventId(
                characterId ?? 0,
                typeof eventId === "string" ? parseInt(eventId) : eventId ?? 0,
                {
                  response:
                    newValue as PutCharactersCharacterIdCalendarEventIdMutationRequestResponse,
                },
                {},
                { headers: { ...authHeaders } },
              );
            },
          });
        }}
        {...otherProps}
      />
    );
  },
);
CalendarEventAttendanceSelect.displayName = "CalendarEventAttendanceSelect";
