import { memo, useEffect, useState } from "react";
import { Loader, Select, type SelectProps } from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";

import {
  putCharactersCharacterIdCalendarEventId,
  PutCharactersCharacterIdCalendarEventIdBodyResponse,
  useGetCharactersCharacterIdCalendarEventId,
} from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

export type CalendarEventAttendanceSelect = Omit<SelectProps, "data"> & {
  eventId?: string | number;
};
export const CalendarEventAttendanceSelect = memo(
  ({ eventId, ...otherProps }: CalendarEventAttendanceSelect) => {
    const [value, setValue] = useState<
      keyof typeof PutCharactersCharacterIdCalendarEventIdBodyResponse | null
    >(
      (otherProps.value as PutCharactersCharacterIdCalendarEventIdBodyResponse) ??
        null,
    );
    const { characterId, isTokenValid, scopes } = useEsiClientContext();
    const { data: event, isLoading } =
      useGetCharactersCharacterIdCalendarEventId(
        characterId ?? 0,
        typeof eventId === "string" ? parseInt(eventId) : eventId ?? 0,
        {},
        {
          swr: {
            enabled:
              !!eventId &&
              isTokenValid &&
              scopes.includes("esi-calendar.read_calendar_events.v1"),
          },
        },
      );

    const canRespondToEvents = scopes.includes(
      "esi-calendar.respond_calendar_events.v1",
    );

    useEffect(() => {
      if (value === null && event?.data.response) {
        setValue(
          event.data
            .response as PutCharactersCharacterIdCalendarEventIdBodyResponse,
        );
      }
    }, [event, value]);

    const values = Object.values(
      PutCharactersCharacterIdCalendarEventIdBodyResponse,
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
        onChange={(
          newValue: PutCharactersCharacterIdCalendarEventIdBodyResponse,
        ) => {
          if (value === newValue) return;
          if (!canRespondToEvents) return;
          if (newValue === null) return;
          openConfirmModal({
            title: "Are you sure?",
            children: `This will mark event ${event?.data.title} as ${newValue}.`,
            labels: { confirm: "Confirm", cancel: "Cancel" },
            onConfirm: () => {
              setValue(newValue);
              otherProps.onChange?.(newValue);
              void putCharactersCharacterIdCalendarEventId(
                characterId ?? 0,
                typeof eventId === "string" ? parseInt(eventId) : eventId ?? 0,
                { response: newValue },
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
