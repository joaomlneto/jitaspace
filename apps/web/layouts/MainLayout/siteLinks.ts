import type { Icon } from "@tabler/icons-react";
import {
  IconActivityHeartbeat,
  IconHeart,
  IconInfoCircle,
} from "@tabler/icons-react";

export interface SiteLink {
  href: string;
  label: string;
  Icon: Icon;
}

/**
 * The site's own pages, linked from the header's JitaSpace menu and from the
 * footer at the bottom of every page. Both render on every page, so link them
 * with HoverPrefetchLink: prefetching them on sight would fetch all three on
 * every page view (four PPR segment requests each, ~400k requests/day).
 */
export const siteLinks: SiteLink[] = [
  { href: "/about", label: "About", Icon: IconInfoCircle },
  { href: "/support", label: "Support", Icon: IconHeart },
  { href: "/status", label: "Status", Icon: IconActivityHeartbeat },
];
