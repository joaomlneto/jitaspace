"use client";

import { useCallback, useMemo, useState } from "react";
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

import { SystemBellIcon } from "@jitaspace/eve-icons";
import { useMultipleCharacterNotifications } from "@jitaspace/hooks";

import { groupNotifications, NotificationList } from "./NotificationList";

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
  // Stable, so the list's memoised rows don't all re-render with the button.
  const close = useCallback(() => setOpened(false), []);
  // One event sent to several of the user's characters counts once, as the
  // list shows it once.
  const groups = useMemo(() => groupNotifications(data), [data]);

  if (subjectIds.length === 0) return null;

  const unread = groups.filter((group) => group.unread).length;
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
            <SystemBellIcon size={20} color="currentColor" alt="" />
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
              onNavigate={close}
            />
          </ScrollArea.Autosize>
        )}
        {(errors.length > 0 || groups.length > limit) && (
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
              {groups.length > limit && (
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
