"use client";

import type { ComponentProps, FocusEvent, MouseEvent, TouchEvent } from "react";
import { useState } from "react";
import Link from "next/link";

export type HoverPrefetchLinkProps = ComponentProps<typeof Link>;

/**
 * A `next/link` that prefetches its destination only once the visitor shows
 * intent — hover, touch or keyboard focus — instead of as soon as it scrolls
 * into view.
 *
 * Use it for links that are on screen on many pages or many times on one page:
 * layout chrome, breadcrumbs, and entity links in lists. Next prefetches a
 * visible `Link` with several segment requests, so each such link costs a few
 * requests on every page view whether or not anyone clicks it. `prefetch=
 * {false}` alone is not the answer: it also switches off the hover prefetch
 * `Link` would otherwise do, so the click is slower for no extra saving. This
 * is the pattern from Next's prefetching guide ("Hover-triggered prefetch"),
 * with touch and focus added because phones have no hover.
 *
 * An explicit `prefetch` from the caller still wins, so a link can opt back in
 * to `true` or out for good with `false`.
 */
export function HoverPrefetchLink({
  prefetch,
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...props
}: HoverPrefetchLinkProps) {
  const [intent, setIntent] = useState(false);

  return (
    <Link
      {...props}
      prefetch={prefetch ?? (intent ? null : false)}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        setIntent(true);
        onMouseEnter?.(event);
      }}
      onTouchStart={(event: TouchEvent<HTMLAnchorElement>) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        setIntent(true);
        onFocus?.(event);
      }}
    />
  );
}
