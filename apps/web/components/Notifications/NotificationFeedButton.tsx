"use client";

import { useState } from "react";
import {
  ActionIcon,
  Button,
  Center,
  Divider,
  Group,
  Indicator,
  Loader,
  Popover,
  ScrollArea,
  Text,
} from "@mantine/core";
import { IconRss } from "@tabler/icons-react";

import { useMultipleCharacterNotifications } from "@jitaspace/hooks";

import { isUnreadNotification, NotificationList } from "./NotificationList";

/**
 * How many notifications the feed lists at first, and how many more each
 * "Show older" adds. ESI keeps up to 500 per character, and a merged feed of
 * several characters is too long to render whole on every open.
 */
const FEED_PAGE = 50;

/**
 * The header's notification feed, after the in-game one: an icon carrying the
 * number of unread notifications across every logged-in character, which opens
 * their merged notification history.
 *
 * Renders nothing until some character has granted the notifications scope.
 */
export function NotificationFeedButton() {
  const { data, isPending, errors, subjectIds } =
    useMultipleCharacterNotifications();
  const [limit, setLimit] = useState(FEED_PAGE);
  const [opened, setOpened] = useState(false);

  if (subjectIds.length === 0) return null;

  const unread = data.filter(isUnreadNotification).length;
  const label = unread > 0 ? `${unread} unread notifications` : "Notifications";

  return (
    <Popover
      position="bottom-end"
      width={380}
      shadow="md"
      withArrow
      transitionProps={{ transition: "pop-top-right" }}
      opened={opened}
      onChange={setOpened}
      // Start from the newest page again on every open.
      onClose={() => setLimit(FEED_PAGE)}
    >
      <Popover.Target>
        <Indicator
          label={unread > 99 ? "99+" : unread}
          size={18}
          color="red"
          offset={4}
          disabled={unread === 0}
        >
          <ActionIcon
            // A controlled Popover leaves toggling to its target.
            onClick={() => setOpened((current) => !current)}
            variant="subtle"
            color="gray"
            size="lg"
            aria-label={label}
            title={label}
          >
            <IconRss size={22} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0} maw="calc(100vw - 32px)">
        <Group justify="space-between" px="sm" py="xs">
          <Text fw={600}>Notification History</Text>
          {unread > 0 && (
            <Text size="xs" c="dimmed">
              {unread} unread
            </Text>
          )}
        </Group>
        <Divider />
        {isPending && data.length === 0 ? (
          <Center p="md">
            <Loader size="sm" />
          </Center>
        ) : (
          <ScrollArea.Autosize mah="min(70vh, 560px)" type="auto">
            <NotificationList
              notifications={data}
              showRecipient={subjectIds.length > 1}
              limit={limit}
              onNavigate={() => setOpened(false)}
            />
          </ScrollArea.Autosize>
        )}
        {(errors.length > 0 || data.length > limit) && (
          <>
            <Divider />
            <Group justify="space-between" px="sm" py="xs" gap="xs">
              {errors.length > 0 ? (
                <Text size="xs" c="red">
                  Could not load {errors.length} of {subjectIds.length}{" "}
                  characters
                </Text>
              ) : (
                <span />
              )}
              {data.length > limit && (
                <Button
                  variant="subtle"
                  size="compact-xs"
                  onClick={() => setLimit((current) => current + FEED_PAGE)}
                >
                  Show older
                </Button>
              )}
            </Group>
          </>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
