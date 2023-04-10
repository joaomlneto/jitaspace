import { Anchor, Container, createStyles, Footer, Text } from "@mantine/core";
import React from "react";

export const FOOTER_HEIGHT = 60;

const useStyles = createStyles((theme) => ({
  container: {
    height: FOOTER_HEIGHT + theme.spacing.xl,
  },
  footer: {
    position: "absolute",
    height: FOOTER_HEIGHT,
    marginTop: FOOTER_HEIGHT,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,

    [theme.fn.smallerThan("sm")]: {
      flexDirection: "column",
    },
  },
}));

export default function DefaultLayoutFooter() {
  const { classes } = useStyles();

  return (
    <Container className={classes.container}>
      <Footer height="auto" className={classes.footer}>
        <Text color="dimmed" size="xs" align="center">
          All EVE-related materials are property of{" "}
          <Anchor href="https://ccpgames.com" target="_blank">
            CCP Games
          </Anchor>
          .
        </Text>
      </Footer>
    </Container>
  );
}
