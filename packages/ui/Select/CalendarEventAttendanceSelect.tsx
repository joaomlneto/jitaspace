"use client";

import type { SelectProps } from "@mantine/core";
import { memo, useEffect, useState } from "react";
import { Loader, Select } from "@mantine/core";

export type CalendarEventAttendanceResponse =
  | "accepted"
  | "declined"
  | "tentative"
  | "not_responded";

const responseOptions: CalendarEventAttendanceResponse[] = [
  "accepted",
  "declined",
  "tentative",
  "not_responded",
];

export type CalendarEventAttendanceSelectProps = Omit<SelectProps, "data"> & {
  initialResponse?: CalendarEventAttendanceResponse | null;
  canRespond?: boolean;
  isLoading?: boolean;
  /**
   * Asks before a new response is applied: call `apply` to go ahead, or don't
   * to leave the response as it was. Without it, a pick applies at once.
   * The web app opens a confirmation modal here.
   */
  confirmResponse?: (
    response: CalendarEventAttendanceResponse,
    apply: () => void,
  ) => void;
  onRespond?: (response: CalendarEventAttendanceResponse) => void;
};

export const CalendarEventAttendanceSelect = memo(
  ({
    initialResponse,
    canRespond,
    isLoading,
    confirmResponse,
    onRespond,
    ...otherProps
  }: CalendarEventAttendanceSelectProps) => {
    const [value, setValue] = useState<CalendarEventAttendanceResponse | null>(
      (otherProps.value as
        | CalendarEventAttendanceResponse
        | null
        | undefined) ?? null,
    );

    useEffect(() => {
      if (value === null && initialResponse) {
        setValue(initialResponse);
      }
    }, [initialResponse, value]);

    const values = responseOptions.map((r) => ({
      value: r,
      label: r.charAt(0).toUpperCase() + r.slice(1).replaceAll("_", " "),
    }));

    return (
      <Select
        {...otherProps}
        readOnly={!canRespond}
        rightSection={isLoading ? <Loader size="xs" /> : undefined}
        data={values}
        value={value}
        placeholder={"Not responded"}
        clearable={false}
        onChange={(newValue: string | null, options) => {
          if (value === newValue) return;
          if (!canRespond) return;
          if (newValue === null) return;
          if (
            !responseOptions.includes(
              newValue as CalendarEventAttendanceResponse,
            )
          )
            return;
          const response = newValue as CalendarEventAttendanceResponse;
          const apply = () => {
            setValue(response);
            otherProps.onChange?.(newValue, options);
            onRespond?.(response);
          };
          if (confirmResponse) confirmResponse(response, apply);
          else apply();
        }}
      />
    );
  },
);
CalendarEventAttendanceSelect.displayName = "CalendarEventAttendanceSelect";
