import { createStyles, Group, Stack, Text, Tooltip } from "@mantine/core";

const useStyles = createStyles((theme) => ({
  trained: {
    backgroundColor: theme.colorScheme === "dark" ? "#CCCCCC" : "#464646",
  },

  queued: {
    backgroundColor: "#6CA5BC",
  },

  missing: {
    backgroundColor: "#3E4846",
  },

  missingStrong: {
    backGroundColor: "#EC655F",
  },

  notRequired: {
    border: "1px solid #CCCCCC80",
  },
}));

export type SkillBarProps = {
  activeLevel?: number;
  requiredLevel?: number;
  requirementType?: "queued" | "missing" | "missingStrong";
};

export function SkillBar({
  activeLevel = 0,
  requiredLevel = 5,
  requirementType = "missing",
}: SkillBarProps) {
  const { classes } = useStyles();

  const isTrained = (level: number) => level <= activeLevel;
  const isRequired = (level: number) => requiredLevel && level <= requiredLevel;

  const getIcon = (level: number) => (
    <div
      key={level}
      style={{
        width: 8,
        height: 8,
        margin: "1px",
      }}
      className={((level) => {
        if (isTrained(level)) return classes.trained;
        if (isRequired(level)) return classes[requirementType];
        return classes.notRequired;
      })(level)}
    />
  );

  return (
    <Tooltip
      label={
        <Stack spacing={0}>
          <Group position="apart">
            <Text size="xs">Level trained:</Text>
            <Text size="xs">{activeLevel}</Text>
          </Group>
          {requiredLevel && (
            <Group position="apart">
              <Text size="xs">Level required:</Text>
              <Text size="xs">{requiredLevel}</Text>
            </Group>
          )}
        </Stack>
      }
    >
      <Group spacing={0}>
        {[1, 2, 3, 4, 5].map((level) => getIcon(level))}
      </Group>
    </Tooltip>
  );
}
