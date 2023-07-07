import { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";
import { format as formatFn } from "date-fns";

type FormattedDateTextProps = Omit<TextProps, "children"> & {
  date?: Date;
  format?: string;
  options?: {
    locale?: Locale;
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    firstWeekContainsDate?: number;
    useAdditionalWeekYearTokens?: boolean;
    useAdditionalDayOfYearTokens?: boolean;
  };
};

export const FormattedDateText = memo(
  ({ date, format, options, ...otherProps }: FormattedDateTextProps) => {
    if (!date) {
      return (
        <Skeleton>
          <Text {...otherProps}>yyyy-MM-dd HH:mm:ss</Text>
        </Skeleton>
      );
    }
    return (
      <Text {...otherProps}>
        {formatFn(date, format ?? "yyyy-MM-dd HH:mm:ss", options)}
      </Text>
    );
  },
);
FormattedDateText.displayName = "DateText";
