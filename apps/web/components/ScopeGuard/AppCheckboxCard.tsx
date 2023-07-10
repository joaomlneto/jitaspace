import { useMemo } from "react";
import {
  Checkbox,
  Code,
  createStyles,
  Group,
  rem,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";

import { type ESIScope } from "@jitaspace/esi-client";
import { InfoIcon } from "@jitaspace/eve-icons";

import { type JitaApp } from "~/config/apps";
import { AppScopeSetCheckboxCard } from "./AppScopeSetCheckboxCard";

const useStyles = createStyles(
  (
    theme,
    { checked, indeterminate }: { checked: boolean; indeterminate: boolean },
  ) => ({
    wrapper: {
      display: "flex",
      alignItems: "center",
      width: "100%",
      transition: "background-color 150ms ease, border-color 150ms ease",
      border: `${rem(1)} solid ${
        checked || indeterminate
          ? theme.fn.variant({ variant: "outline", color: theme.primaryColor })
              .border
          : theme.colorScheme === "dark"
          ? theme.colors.dark[8]
          : theme.colors.gray[3]
      }`,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.sm,
      backgroundColor:
        checked || indeterminate
          ? theme.fn.variant({ variant: "light", color: theme.primaryColor })
              .background
          : theme.colorScheme === "dark"
          ? theme.colors.dark[8]
          : theme.white,
    },
    button: {
      display: "flex",
      alignItems: "center",
      width: "100%",
      transition: "background-color 150ms ease, border-color 150ms ease",
      border: `${rem(1)} solid ${
        theme.colorScheme === "dark"
          ? theme.colors.dark[8]
          : theme.colors.gray[3]
      }`,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.sm,
      backgroundColor:
        theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.white,
    },

    body: {
      flex: 1,
      marginLeft: theme.spacing.md,
      marginRight: theme.spacing.md,
    },
  }),
);

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

  const { classes, cx } = useStyles({ checked, indeterminate });

  return (
    <Stack spacing="xs" className={cx(classes.button, className)}>
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
          <Text weight={500} size="sm" sx={{ lineHeight: 1 }} mb={5}>
            {app.name}
          </Text>
          <Text color="dimmed" size="xs" sx={{ lineHeight: 1.2 }}>
            {app.description}
          </Text>
        </div>

        <Group spacing="xs" noWrap>
          {!showScopeDetails && (
            <Tooltip
              color="dark"
              p={0}
              m={0}
              style={{ backgroundColor: "transparent" }}
              label={
                <Stack spacing={4}>
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
