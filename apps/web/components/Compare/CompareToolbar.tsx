"use client";

import { memo } from "react";
import {
  Button,
  CloseButton,
  Group,
  SegmentedControl,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { IconFilter, IconTrash } from "@tabler/icons-react";

import type { Comparison } from "./comparison";

export interface CompareToolbarProps {
  itemCount: number;
  onlyDifferences: boolean;
  onOnlyDifferencesChange: (value: boolean) => void;
  showHidden: boolean;
  onShowHiddenChange: (value: boolean) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  comparison?: Comparison;
  /** Offer a button that removes every item. */
  onClear?: () => void;
}

/** View options for the table, and how many rows they let through. */
export const CompareToolbar = memo(
  ({
    itemCount,
    onlyDifferences,
    onOnlyDifferencesChange,
    showHidden,
    onShowHiddenChange,
    filter,
    onFilterChange,
    comparison,
    onClear,
  }: CompareToolbarProps) => {
    const canDiff = itemCount > 1;
    return (
      <Group justify="space-between" gap="sm" wrap="wrap">
        <Group gap="sm" wrap="wrap">
          <SegmentedControl
            size="xs"
            aria-label="Rows to show"
            value={canDiff && onlyDifferences ? "differences" : "all"}
            onChange={(value) =>
              onOnlyDifferencesChange(value === "differences")
            }
            disabled={!canDiff}
            data={[
              { label: "Differences", value: "differences" },
              { label: "All attributes", value: "all" },
            ]}
          />
          <TextInput
            size="xs"
            w={220}
            aria-label="Filter attributes"
            placeholder="Filter attributes"
            leftSection={<IconFilter size={14} />}
            value={filter}
            onChange={(event) => onFilterChange(event.currentTarget.value)}
            rightSection={
              filter ? (
                <CloseButton
                  size="sm"
                  aria-label="Clear filter"
                  onClick={() => onFilterChange("")}
                />
              ) : null
            }
          />
          <Switch
            size="xs"
            label="Hidden attributes"
            checked={showHidden}
            onChange={(event) =>
              onShowHiddenChange(event.currentTarget.checked)
            }
          />
          {onClear && (
            <Button
              variant="subtle"
              color="gray"
              size="compact-xs"
              leftSection={<IconTrash size={12} />}
              onClick={onClear}
            >
              Clear all
            </Button>
          )}
        </Group>
        <Text size="xs" c="dimmed" role="status" aria-live="polite">
          {canDiff && (
            <>
              <Text span c="teal.4" fw={700} inherit>
                best
              </Text>
              {" · "}
              <Text span c="red.4" fw={700} inherit>
                worst
              </Text>
              {" · % against the first column · "}
            </>
          )}
          {comparison &&
            `${comparison.shownRows} of ${comparison.totalRows} rows`}
          {comparison &&
            comparison.identicalRows > 0 &&
            ` (${comparison.identicalRows} identical hidden)`}
        </Text>
      </Group>
    );
  },
);
CompareToolbar.displayName = "CompareToolbar";
