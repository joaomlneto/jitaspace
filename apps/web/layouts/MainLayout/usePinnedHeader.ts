"use client";

import { useEffect, useState } from "react";

interface UsePinnedHeaderOptions {
  /** Above this scroll offset (px) the header is always shown. */
  fixedAt?: number;
  /** Scroll distance (px) over which the header slides fully in or out. */
  scrollDistance?: number;
}

/**
 * Whether the auto-hiding header should be shown: hidden while scrolling down,
 * revealed as soon as the user scrolls back up.
 *
 * Same rules as Mantine's `useHeadroom`, which keeps the scroll position in
 * React state and so re-renders its caller on every `scroll` event — here that
 * was the whole AppShell, header, tab bar and footer on every scroll frame. This
 * tracks the position in the listener's closure instead and only sets state
 * when the pinned/unpinned answer flips, which is a handful of times per page.
 * (One difference: `useHeadroom` ignores the first event after a change of
 * direction, so it reveals a few pixels later than this does.)
 */
export function usePinnedHeader({
  fixedAt = 0,
  scrollDistance = 100,
}: UsePinnedHeaderOptions = {}): boolean {
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    // 1 = fully shown, 0 = fully hidden. Scrolling down drains it over
    // `scrollDistance` px; scrolling up refills it, so any upward scroll pins.
    let progress = 1;
    let lastY = window.scrollY;

    const update = () => {
      const y = window.scrollY;
      if (y <= fixedAt) {
        progress = 1;
      } else {
        // Measure from `fixedAt` when leaving the fixed zone, so the header
        // starts hiding at the threshold rather than at the previous event.
        const delta = Math.max(lastY, fixedAt) - y;
        progress = Math.min(1, Math.max(0, progress + delta / scrollDistance));
      }
      lastY = y;
      // React bails out when the value is unchanged, so steady scrolling in
      // one direction does not render anything.
      setPinned(progress > 0);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [fixedAt, scrollDistance]);

  return pinned;
}
