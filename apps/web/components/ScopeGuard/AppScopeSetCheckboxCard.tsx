import { useMemo } from "react";
import {
  Badge,
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

import { type AppScopeSet } from "~/config/apps";

const useStyles = createStyles((theme, { checked }: { checked: boolean }) => ({
  button: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    transition: "background-color 150ms ease, border-color 150ms ease",
    border: `${rem(1)} solid ${
      checked
        ? theme.fn.variant({ variant: "outline", color: theme.primaryColor })
            .border
        : theme.colorScheme === "dark"
        ? theme.colors.dark[8]
        : theme.colors.gray[3]
    }`,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.xs,
    backgroundColor: checked
      ? theme.fn.variant({ variant: "light", color: theme.primaryColor })
          .background
      : theme.colorScheme === "dark"
      ? theme.colors.dark[8]
      : theme.white,
  },

  body: {
    flex: 1,
    marginLeft: theme.spacing.xs,
  },
}));

export type AppScopeSetCheckboxCardProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "title"
> & {
  scopeSet: AppScopeSet;
  selectedScopes: ESIScope[];
  onScopeSelect?(scope: ESIScope[]): void;
  onScopeDeselect?(scope: ESIScope[]): void;
  showDescription?: boolean;
  badge?: string;
};

export function AppScopeSetCheckboxCard({
  scopeSet,
  selectedScopes,
  onScopeSelect,
  onScopeDeselect,
  showDescription,
  badge,
  className,
  ...otherProps
}: AppScopeSetCheckboxCardProps) {
  const allAppScopes = scopeSet.scopes;

  const checked = useMemo(
    () => allAppScopes.every((scope) => selectedScopes.includes(scope)),
    [allAppScopes, selectedScopes],
  );

  const { classes, cx } = useStyles({ checked: checked });

  const optionalScopeChecked = scopeSet.scopes.every((scope) =>
    selectedScopes.includes(scope),
  );

  return (
    <UnstyledButton
      {...otherProps}
      onClick={() => {
        if (optionalScopeChecked) {
          onScopeDeselect?.(scopeSet.scopes);
        } else {
          onScopeSelect?.(scopeSet.scopes);
        }
      }}
      className={cx(classes.button, className)}
      key={scopeSet.reason}
    >
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
          <InfoIcon width={24} />
        </ThemeIcon>
      </Tooltip>
      <div className={classes.body}>
        <Text size="sm" sx={{ lineHeight: 1 }}>
          {scopeSet.reason} {badge && <Badge size="xs">{badge}</Badge>}
        </Text>
        {showDescription && (
          <Text color="dimmed" size="xs" sx={{ lineHeight: 1 }}>
            {scopeSet.description}
          </Text>
        )}
      </div>

      <Group spacing={0} wrap="nowrap">
        <Checkbox
          checked={optionalScopeChecked}
          tabIndex={-1}
          styles={{ input: { cursor: "pointer" } }}
          size="xs"
        />
      </Group>
    </UnstyledButton>
  );
}
