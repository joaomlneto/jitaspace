"use client";

import Link from "next/link";
import { Badge, Box, Button, CloseButton, Stack, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import type { NewsItem } from "~/config/news";
import { formatNewsDate } from "./formatNewsDate";

export interface NewsBannerCardProps {
  item: NewsItem;
  onDismiss: () => void;
}

/**
 * Fixed height (px) of a news banner card. Exported so the carousel can reserve
 * matching vertical space before it mounts, avoiding a layout shift (CLS) when
 * the banner pops in after hydration.
 */
export const NEWS_BANNER_HEIGHT = 200;

/**
 * Flashy, image-forward banner card (EVE-launcher style): a hero image with a
 * scrim that darkens the top (for the title) and the bottom (for the date /
 * message / CTA). Falls back to a solid accent colour when there is no image.
 */
export function NewsBannerCard({
  item,
  onDismiss,
}: Readonly<NewsBannerCardProps>) {
  const color = item.color ?? "blue";

  return (
    <Box
      pos="relative"
      h={NEWS_BANNER_HEIGHT}
      bg={item.image ? undefined : `${color}.9`}
      style={{
        borderRadius: "var(--mantine-radius-md)",
        overflow: "hidden",
        ...(item.image
          ? {
              backgroundImage: `url(${item.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      {/* Scrim: darken the top (title) and the bottom (date / message / CTA). */}
      <Box
        pos="absolute"
        inset={0}
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.10) 32%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* Title — top-left */}
      <Text
        c="white"
        fw={700}
        fz="lg"
        lineClamp={2}
        pos="absolute"
        top={0}
        left={0}
        right={0}
        style={{
          zIndex: 1,
          padding: "var(--mantine-spacing-md)",
          paddingRight: "2.75rem", // leave room for the close button
          textShadow: "0 1px 3px rgba(0, 0, 0, 0.55)",
        }}
      >
        {item.title}
      </Text>

      <CloseButton
        aria-label={`Dismiss: ${item.title}`}
        onClick={onDismiss}
        variant="filled"
        color="dark"
        pos="absolute"
        top={8}
        right={8}
        style={{ zIndex: 2 }}
      />

      {/* Date, message and CTA — bottom */}
      <Stack
        gap={6}
        p="md"
        pos="absolute"
        left={0}
        right={0}
        bottom={0}
        style={{ zIndex: 1 }}
      >
        {item.date && (
          <Badge
            color={color}
            variant="filled"
            size="sm"
            style={{ alignSelf: "flex-start" }}
          >
            {formatNewsDate(item.date)}
          </Badge>
        )}
        <Text c="gray.3" size="sm" lineClamp={2}>
          {item.message}
        </Text>

        {item.link &&
          (item.link.external ? (
            <Button
              component="a"
              href={item.link.href}
              target="_blank"
              rel="noopener noreferrer"
              color={color}
              size="xs"
              radius="md"
              mt={4}
              style={{ alignSelf: "flex-start" }}
              rightSection={<IconExternalLink size={14} />}
            >
              {item.link.label}
            </Button>
          ) : (
            <Button
              component={Link}
              href={item.link.href}
              color={color}
              size="xs"
              radius="md"
              mt={4}
              style={{ alignSelf: "flex-start" }}
            >
              {item.link.label}
            </Button>
          ))}
      </Stack>
    </Box>
  );
}
