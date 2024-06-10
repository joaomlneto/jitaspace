import React from "react";
import Link from "next/link";
import {
  Button,
  Center,
  Container,
  rem,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { format } from "date-fns";
import useSwr from "swr";

import { TimeAgoText } from "@jitaspace/ui";





export default function Page() {
  const currentImgSrc = "/wallpapers/viridian.jpg";
  const nextImgSrc = "/wallpapers/havoc.jpg";

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
  const expansionReleaseDate = new Date(2024, 5 /* 0 (Jan) to 11 (Dec) */, 10);
  const sdeUpdated =
    lastModifiedDate &&
    lastModifiedDate.getTime() >= expansionReleaseDate.getTime();

  const lastCheckedOn: Date | undefined = data?.date
    ? new Date(data.date)
    : undefined;

  return (
    <Container
      styles={{
        root: {
          paddingTop: rem(80),
          paddingBottom: rem(80),
          position: "relative",
        },
      }}
      fluid
      size="xs"
      style={{
        height: "100vh",
        backgroundImage: `url('${sdeUpdated ? nextImgSrc : currentImgSrc}')`,
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
        <Stack align="center" p="xl" gap="xl" style={{}}>
          <Title ta="center">
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
              Download the SDE
            </Button>
          )}
          {lastModifiedDate && (
            <Text ta="center" size="lg">
              SDE last updated on
              <br />
              <b>{format(lastModifiedDate, "yyyy-MM-dd")}</b>
            </Text>
          )}
          {lastCheckedOn && (
            <Text ta="center" size="sm">
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
