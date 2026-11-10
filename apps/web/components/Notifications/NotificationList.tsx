"use client";

import type { ReactNode } from "react";
import { Fragment, memo, useMemo } from "react";
import { Avatar, Box, Group, Stack, Text, VisuallyHidden } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { CharactersCharacterIdNotificationsGet } from "@jitaspace/esi-client";
import { EveEntityName } from "@jitaspace/eve-components";
import { useEsiName } from "@jitaspace/hooks";
import { CharacterAvatar, TimeAgoText } from "@jitaspace/ui";

import type {
  NotificationTarget,
  SubjectPart,
  WarQuery,
} from "./notificationDetails";
import { HoverPrefetchLink } from "~/components/Link";
import {
  categoryHref,
  notificationSubject,
  notificationTarget,
  parseNotificationFields,
  titleParts,
  warFindUrl,
} from "./notificationDetails";
import classes from "./NotificationList.module.css";
import {
  humanizeNotificationType,
  notificationTitle,
  NotificationTypeIcon,
} from "./notificationTypes";
import { useNotificationTypeNames } from "./useNotificationTypeNames";

/** One notification as ESI returns it, optionally tagged with its recipient. */
export type NotificationListItem =
  CharactersCharacterIdNotificationsGet[number] & {
    /** The character the notification was delivered to. */
    subjectId?: number;
  };

export interface NotificationListProps {
  notifications: readonly NotificationListItem[];
  /**
   * Show which character received each notification. For lists merged from
   * several characters.
   */
  showRecipient?: boolean;
  /** Render at most this many, newest first. */
  limit?: number;
  /** Shown when there is nothing to list. */
  emptyState?: ReactNode;
  /** Called when a notification that links somewhere is clicked. */
  onNavigate?: () => void;
}

/**
 * The exact time, in EVE time (UTC) as players read it. Deterministic, unlike
 * `toLocaleString()`, so server and browser render the same text.
 */
function formatEveTime(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} EVE`;
}

/** Whether a notification counts as unread: ESI omits `is_read` on those. */
export function isUnreadNotification(notification: NotificationListItem) {
  return notification.is_read !== true;
}

/** One event, however many of the user's characters it was delivered to. */
export interface GroupedNotification {
  key: string;
  notification: NotificationListItem;
  /** The characters it was delivered to, in delivery order. */
  recipients: number[];
  /** Unread by at least one recipient. */
  unread: boolean;
}

/**
 * Merge copies of one event: a corporation- or alliance-wide notice reaches
 * each of the user's characters in it as its own notification. Copies agree on
 * type, time, sender and text; anything else is a different notification.
 * Keeps the input's order (each group where its first copy was).
 */
export function groupNotifications(
  notifications: readonly NotificationListItem[],
): GroupedNotification[] {
  const groups = new Map<string, GroupedNotification>();
  for (const notification of notifications) {
    const key = [
      notification.type,
      notification.timestamp,
      notification.sender_id,
      notification.text ?? "",
    ].join("\u0000");
    const group = groups.get(key);
    if (group) {
      if (notification.subjectId !== undefined)
        group.recipients.push(notification.subjectId);
      group.unread ||= isUnreadNotification(notification);
      continue;
    }
    groups.set(key, {
      key,
      notification,
      recipients:
        notification.subjectId === undefined ? [] : [notification.subjectId],
      unread: isUnreadNotification(notification),
    });
  }
  return [...groups.values()];
}

/**
 * A list of character notifications laid out like the in-game notification
 * history: type icon, title, what it is about, sender and how long ago, newest
 * first. A notification about something with a page here (a killmail, a
 * corporation, a system under attack) links to it.
 */
export function NotificationList({
  notifications,
  showRecipient = false,
  limit,
  emptyState = "No notifications",
  onNavigate,
}: Readonly<NotificationListProps>) {
  const typeNames = useNotificationTypeNames();

  const sorted = useMemo(
    () =>
      groupNotifications(
        [...notifications].sort(
          (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
        ),
      ).slice(0, limit),
    [notifications, limit],
  );

  if (sorted.length === 0) {
    return (
      <Text c="dimmed" ta="center" size="sm" p="md">
        {emptyState}
      </Text>
    );
  }

  return (
    <Stack gap={0}>
      {sorted.map((group) => (
        <NotificationRow
          key={group.key}
          group={group}
          title={notificationTitle(group.notification.type, typeNames)}
          showRecipient={showRecipient}
          onNavigate={onNavigate}
        />
      ))}
    </Stack>
  );
}

/** Text, with each id rendered as that entity's name. */
function EntityText({ parts }: Readonly<{ parts: readonly SubjectPart[] }>) {
  // Keyed by content, with a count for the rare repeat, so a key never
  // depends on position alone.
  const seen = new Map<string, number>();
  return parts.map((part) => {
    const base = typeof part === "string" ? `text:${part}` : `id:${part.id}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const key = `${base}#${count}`;
    return typeof part === "string" ? (
      <Fragment key={key}>{part}</Fragment>
    ) : (
      <EveEntityName key={key} entityId={part.id} span inherit />
    );
  });
}

/** The most recipient portraits drawn in an icon's corner. */
const MAX_RECIPIENT_AVATARS = 3;

const NotificationRow = memo(function NotificationRow({
  group,
  title,
  showRecipient,
  onNavigate,
}: {
  group: GroupedNotification;
  /** The type's display name, possibly a template such as `Quit {corp_name}`. */
  title: string;
  showRecipient: boolean;
  onNavigate?: () => void;
}) {
  const { notification, recipients, unread } = group;
  const date = new Date(notification.timestamp);
  const { type, sender_id: senderId, text, timestamp } = notification;

  const { heading, subject, target } = useMemo(() => {
    const fields = parseNotificationFields(text);
    return {
      heading: titleParts(title, fields) ?? [humanizeNotificationType(type)],
      subject: notificationSubject(type, fields),
      target: notificationTarget({ type, senderId, timestamp, fields }),
    };
  }, [title, type, senderId, timestamp, text]);

  const content = (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <Box pos="relative" className={classes.icon}>
        {/* Decorative: the title beside it names the type. */}
        <NotificationTypeIcon type={type} width={40} height={40} alt="" />
        {showRecipient && recipients.length > 0 && (
          <Avatar.Group spacing={8} className={classes.recipient}>
            {recipients.slice(0, MAX_RECIPIENT_AVATARS).map((characterId) => (
              <CharacterAvatar
                key={characterId}
                characterId={characterId}
                size={20}
                radius="sm"
              />
            ))}
            {recipients.length > MAX_RECIPIENT_AVATARS && (
              <Avatar size={20} radius="sm">
                +{recipients.length - MAX_RECIPIENT_AVATARS}
              </Avatar>
            )}
          </Avatar.Group>
        )}
      </Box>
      <Stack gap={2} miw={0} style={{ flex: 1 }}>
        <Text fw={unread ? 700 : 500} size="sm" lh={1.3}>
          <EntityText parts={heading} />
        </Text>
        {subject && (
          <Text size="sm" lh={1.3} lineClamp={2}>
            <EntityText parts={subject} />
          </Text>
        )}
        {notification.sender_type !== "other" && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            from <EveEntityName entityId={senderId} span inherit />
          </Text>
        )}
        <Box title={formatEveTime(date)} w="fit-content">
          <TimeAgoText
            date={date}
            addSuffix
            updateInterval={60_000}
            size="xs"
            c="dimmed"
          />
        </Box>
      </Stack>
      {unread && (
        <>
          <Box className={classes.unreadDot} aria-hidden />
          <VisuallyHidden>Unread</VisuallyHidden>
        </>
      )}
    </Group>
  );

  return (
    <NotificationRowFrame
      target={target}
      unread={unread}
      onNavigate={onNavigate}
    >
      {content}
    </NotificationRowFrame>
  );
});

interface RowFrameProps {
  unread: boolean;
  onNavigate?: () => void;
  children: ReactNode;
}

/** A row, linked to its target if it has one. */
function NotificationRowFrame({
  target,
  ...props
}: RowFrameProps & { target: NotificationTarget | undefined }) {
  if (target && "war" in target) {
    return (
      <WarRowFrame war={target.war} fallback={target.fallback} {...props} />
    );
  }
  if (target && "entityId" in target) {
    return <ResolvedRowFrame entityId={target.entityId} {...props} />;
  }
  return <RowFrame href={target?.href} {...props} />;
}

/**
 * A row linked to the war its notification is about, once `/api/wars/find`
 * has named it. Not a link while that is pending, so a quick click does not
 * land on the fallback; the fallback when we have no such war.
 */
function WarRowFrame({
  war,
  fallback,
  ...props
}: RowFrameProps & { war: WarQuery; fallback?: NotificationTarget }) {
  const url = warFindUrl(war);
  const { data: warId, isPending } = useQuery({
    queryKey: ["war-find", url],
    queryFn: async (): Promise<number | null> => {
      const response = await fetch(url);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return ((await response.json()) as { warId: number }).warId;
    },
    // A miss can mean the war scrape has not caught up yet.
    staleTime: 5 * 60 * 1000,
  });
  if (warId) return <RowFrame href={`/war/${warId}`} {...props} />;
  if (isPending) return <RowFrame href={undefined} {...props} />;
  return <NotificationRowFrame target={fallback} {...props} />;
}

/** A row linked to an entity whose kind is looked up first. */
function ResolvedRowFrame({
  entityId,
  ...props
}: RowFrameProps & { entityId: number }) {
  const { category } = useEsiName(entityId);
  return <RowFrame href={categoryHref(category, entityId)} {...props} />;
}

function RowFrame({
  href,
  unread,
  onNavigate,
  children,
}: RowFrameProps & { href: string | undefined }) {
  const shared = {
    className: classes.row,
    "data-unread": unread || undefined,
    px: "sm",
    py: "xs",
  } as const;
  return href ? (
    <Box
      // Prefetch on intent: a full feed would otherwise prefetch every row.
      component={HoverPrefetchLink}
      href={href}
      onClick={onNavigate}
      data-link
      {...shared}
    >
      {children}
    </Box>
  ) : (
    <Box {...shared}>{children}</Box>
  );
}
