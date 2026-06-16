"use client";

import type { SelectProps } from "@mantine/core";
import { memo, useEffect, useState } from "react";
import { Loader, Select } from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";

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
  eventTitle?: string;
  initialResponse?: CalendarEventAttendanceResponse | null;
  canRespond?: boolean;
  isLoading?: boolean;
  onRespond?: (response: CalendarEventAttendanceResponse) => void;
};

export const CalendarEventAttendanceSelect = memo(
  ({
    eventTitle,
    initialResponse,
    canRespond,
    isLoading,
    onRespond,
    ...otherProps
  }: CalendarEventAttendanceSelectProps) => {
    const [value, setValue] = useState<CalendarEventAttendanceResponse | null>(
      (otherProps.value as CalendarEventAttendanceResponse | null | undefined) ??
        null,
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
          openConfirmModal({
            title: "Are you sure?",
            children: `This will mark event ${eventTitle} as ${newValue}.`,
            labels: { confirm: "Confirm", cancel: "Cancel" },
            onConfirm: () => {
              setValue(newValue as CalendarEventAttendanceResponse);
              otherProps.onChange?.(newValue, options);
              onRespond?.(newValue as CalendarEventAttendanceResponse);
            },
          });
        }}
      />
    );
  },
);
CalendarEventAttendanceSelect.displayName = "CalendarEventAttendanceSelect";
