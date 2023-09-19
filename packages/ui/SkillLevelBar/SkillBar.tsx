import {createStyles, Group, Stack, Text, Tooltip} from "@mantine/core";
import {memo} from "react";

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

export const SkillBar = memo(
  ({
    activeLevel = 0,
    requiredLevel = 5,
    requirementType = "missing",
  }: SkillBarProps) => {
    const { classes } = useStyles();

    const isTrained = (level: number) => level <= activeLevel;
    const isRequired = (level: number) =>
      requiredLevel && level <= requiredLevel;

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
            <Group justify="apart">
              <Text size="xs">Level trained:</Text>
              <Text size="xs">{activeLevel}</Text>
            </Group>
            {requiredLevel && (
              <Group justify="apart">
                <Text size="xs">Level required:</Text>
                <Text size="xs">{requiredLevel}</Text>
              </Group>
            )}
          </Stack>
        }
      >
        <Group gap{0}>
          {[1, 2, 3, 4, 5].map((level) => getIcon(level))}
        </Group>
      </Tooltip>
    );
  },
);
SkillBar.displayName = "SkillBar";
