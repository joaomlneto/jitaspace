import React from "react";
import Link from "next/link";
import {
  Button,
  Center,
  Container,
  createStyles,
  rem,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { format } from "date-fns";
import useSwr from "swr";

import { TimeAgoText } from "@jitaspace/ui";

const useStyles = createStyles((theme) => ({
  root: {
    paddingTop: rem(80),
    paddingBottom: rem(80),
    position: "relative",
  },

  label: {
    textAlign: "center",
    fontWeight: 900,
    fontSize: rem(220),
    lineHeight: 1,
    marginBottom: `calc(${theme.spacing.xl} * 1.5)`,
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[4]
        : theme.colors.gray[2],

    [theme.fn.smallerThan("sm")]: {
      fontSize: rem(120),
    },
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    textAlign: "center",
    fontWeight: 900,
    fontSize: rem(38),

    [theme.fn.smallerThan("sm")]: {
      fontSize: rem(32),
    },
  },

  description: {
    maxWidth: rem(500),
    margin: "auto",
    marginTop: theme.spacing.xl,
    marginBottom: `calc(${theme.spacing.xl} * 1.5)`,
  },
}));
export default function Page() {
  const { classes } = useStyles();

  const uprisingImgSrc = "/wallpapers/uprising.jpg";
  const viridianImgSrc = "/wallpapers/viridian.jpg";

  const { data, isLoading } = useSwr<{
    lastModified: string;
    date: string;
  }>(
    "/api/sde-last-modified",
    (url: string) => fetch(url).then((res) => res.json()),
    {
      refreshInterval: 60 * 1000,
    },
  );

  const lastModifiedDate: Date | undefined = data?.lastModified
    ? new Date(data.lastModified)
    : undefined;
  const startOfJune = new Date(2023, 5, 1);
  const sdeUpdated = lastModifiedDate && lastModifiedDate > startOfJune;

  const lastCheckedOn: Date | undefined = data?.date
    ? new Date(data.date)
    : undefined;

  return (
    <Container
      className={classes.root}
      fluid
      size="xs"
      style={{
        height: "100vh",
        backgroundImage: `url('${
          sdeUpdated ? viridianImgSrc : uprisingImgSrc
        }')`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      p={0}
      m={0}
    >
      <Center
        maw={400}
        mx="auto"
        style={{
          backgroundColor: "#000000aa",
          margin: 0,
          position: "absolute",
          top: "50%",
          left: "50%",
          msTransform: "translate(-50%, -50%)",
          transform: "translate(-50%, -50%)",
        }}
      >
        <Stack align="center" p="xl" spacing="xl" style={{}}>
          <Title align="center">
            {isLoading && "Checking..."}
            {!isLoading && sdeUpdated && "Yes!"}
            {!isLoading && !sdeUpdated && "Not yet!"}
          </Title>
          {!isLoading && sdeUpdated && (
            <Button
              variant="subtle"
              component={Link}
              href="https://eve-static-data-export.s3-eu-west-1.amazonaws.com/tranquility/sde.zip"
            >
              Download SDE
            </Button>
          )}
          {lastModifiedDate && (
            <Text align="center" size="lg">
              SDE last updated on
              <br />
              <b>{format(lastModifiedDate, "yyyy-MM-dd")}</b>
            </Text>
          )}
          {lastCheckedOn && (
            <Text align="center" size="sm">
              Last checked
              <br />
              <TimeAgoText span date={lastCheckedOn} /> ago
            </Text>
          )}
        </Stack>
      </Center>
    </Container>
  );
}
