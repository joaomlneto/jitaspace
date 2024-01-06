import { useMemo } from "react";
import {
  Checkbox,
  Code,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import cx from "clsx";

import { type ESIScope } from "@jitaspace/esi-metadata";
import { InfoIcon } from "@jitaspace/eve-icons";

import { type JitaApp } from "~/config/apps";
import classes from "./AppCheckboxCard.module.css";
import { AppScopeSetCheckboxCard } from "./AppScopeSetCheckboxCard";


export type AppCheckboxCardProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "title"
> & {
  app: JitaApp;
  selectedScopes: ESIScope[];
  showScopeDetails?: boolean;
  onScopeSelect?(scope: ESIScope[]): void;
  onScopeDeselect?(scope: ESIScope[]): void;
};

export function AppCheckboxCard({
  app,
  selectedScopes,
  showScopeDetails,
  onScopeSelect,
  onScopeDeselect,
  className,
  ...otherProps
}: AppCheckboxCardProps) {
  const allRequiredAppScopes = [
    ...new Set(
      [...(app.scopes.required ?? [])].flatMap(({ scopes }) => scopes),
    ),
  ];
  const allOptionalAppScopes = [
    ...new Set(
      [...(app.scopes.optional ?? [])].flatMap(({ scopes }) => scopes),
    ),
  ];
  const allAppScopes = [
    ...new Set([...allRequiredAppScopes, ...allOptionalAppScopes]),
  ];

  const checked = useMemo(
    () => allAppScopes.every((scope) => selectedScopes.includes(scope)),
    [allAppScopes, selectedScopes],
  );

  const indeterminate = useMemo(
    () =>
      !checked &&
      allRequiredAppScopes.every((scope) => selectedScopes.includes(scope)),
    [allRequiredAppScopes, checked, selectedScopes],
  );

  return (
    <Stack gap="xs" className={cx(classes.button, className)}>
      <UnstyledButton
        className={cx(classes.wrapper, className)}
        onClick={() => {
          console.log("changing", app.name, "to", !checked);
          if (checked) {
            onScopeDeselect?.(allAppScopes);
          } else {
            onScopeSelect?.(allAppScopes);
          }
        }}
        {...otherProps}
      >
        <app.Icon width={40} />

        <div className={classes.body}>
          <Text fw={500} size="sm" style={{ lineHeight: 1 }} mb={5}>
            {app.name}
          </Text>
          <Text c="dimmed" size="xs" style={{ lineHeight: 1.2 }}>
            {app.description}
          </Text>
        </div>

        <Group gap="xs" wrap="nowrap">
          {!showScopeDetails && (
            <Tooltip
              color="dark"
              p={0}
              m={0}
              style={{ backgroundColor: "transparent" }}
              label={
                <Stack gap={4}>
                  {allAppScopes.map((scope) => (
                    <Code key={scope}>{scope}</Code>
                  ))}
                </Stack>
              }
            >
              <ThemeIcon variant="none">
                <InfoIcon width={30} />
              </ThemeIcon>
            </Tooltip>
          )}
          <Checkbox
            checked={indeterminate || checked}
            indeterminate={indeterminate}
            //onChange={() => {}}
            tabIndex={-1}
            styles={{ input: { cursor: "pointer" } }}
          />
        </Group>
      </UnstyledButton>
      {showScopeDetails &&
        app.scopes.required?.map((optionalScope) => {
          return (
            <AppScopeSetCheckboxCard
              scopeSet={optionalScope}
              selectedScopes={selectedScopes}
              badge="required"
              key={optionalScope.reason}
              onScopeSelect={() =>
                onScopeSelect?.([
                  ...allRequiredAppScopes,
                  ...optionalScope.scopes,
                ])
              }
              onScopeDeselect={() => onScopeDeselect?.(allAppScopes)}
            />
          );
        })}
      {showScopeDetails &&
        app.scopes.optional?.map((optionalScope) => {
          return (
            <AppScopeSetCheckboxCard
              scopeSet={optionalScope}
              selectedScopes={selectedScopes}
              key={optionalScope.reason}
              onScopeSelect={() =>
                onScopeSelect?.([
                  ...allRequiredAppScopes,
                  ...optionalScope.scopes,
                ])
              }
              onScopeDeselect={() => onScopeDeselect?.(optionalScope.scopes)}
            />
          );
        })}
    </Stack>
  );
}
