"use client";

import type { CSSProperties } from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Text, useMantineTheme } from "@mantine/core";

import type { EveIconComponent } from "@jitaspace/eve-icons";
import {
  CategoryIskIcon,
  ControlRegionLayoutIcon,
  SystemHouseIcon,
  SystemSearchIcon,
} from "@jitaspace/eve-icons";

import { HoverPrefetchLink } from "~/components/Link";
import classes from "./MobileTabBar.module.css";

interface Tab {
  label: string;
  href: string;
  Icon: EveIconComponent;
  /** Marks the tab active when the pathname starts with one of these. */
  match: string[];
}

// A small, thumb-reachable set of top destinations. The full navigation stays
// available via the header burger menu. All of these work without logging in.
const tabs: Tab[] = [
  { label: "Home", href: "/", Icon: SystemHouseIcon, match: ["/"] },
  {
    label: "Search",
    href: "/search",
    Icon: SystemSearchIcon,
    match: ["/search"],
  },
  {
    label: "Market",
    href: "/market",
    Icon: CategoryIskIcon,
    match: ["/market"],
  },
  {
    label: "Map",
    href: "/regions",
    Icon: ControlRegionLayoutIcon,
    match: ["/regions", "/region"],
  },
];

function isActive(pathname: string | null, tab: Tab): boolean {
  if (tab.href === "/") return pathname === "/";
  return tab.match.some((prefix) => pathname?.startsWith(prefix));
}

function TabBarLinks({ pathname }: Readonly<{ pathname: string | null }>) {
  const { primaryColor } = useMantineTheme();
  return (
    <nav
      className={classes.bar}
      aria-label="Primary"
      // The active label is 10px text, so it takes the primary colour's
      // text-safe shade (`-text`: lighter in dark mode) rather than the filled
      // one, which is too dark to read on a dark bar (Crimson Harvest's
      // crimson.6 on its near-black bar is 4.4:1).
      style={
        {
          "--tab-active-color": `var(--mantine-color-${primaryColor}-text)`,
        } as CSSProperties
      }
    >
      {tabs.map((tab) => {
        const active = isActive(pathname, tab);
        return (
          // The bar is in the DOM on every page and viewport (CSS only hides
          // it on desktop), so letting these prefetch on sight cost four PPR
          // segment requests per link on every page view. They prefetch on
          // touch or hover instead.
          <HoverPrefetchLink
            key={tab.href}
            href={tab.href}
            className={classes.tab}
            data-active={active || undefined}
            aria-current={active ? "page" : undefined}
          >
            <tab.Icon size={22} color="currentColor" alt="" />
            <Text size="0.625rem" fw={500} className={classes.label}>
              {tab.label}
            </Text>
          </HoverPrefetchLink>
        );
      })}
    </nav>
  );
}

function ActiveTabBar() {
  const pathname = usePathname();
  return <TabBarLinks pathname={pathname} />;
}

export function MobileTabBar() {
  // usePathname reads request data; under Next's Cache Components it must sit
  // inside a Suspense boundary or it blocks prerendering of every page. The
  // fallback renders the same bar without active state, so there's no shift.
  return (
    <Suspense fallback={<TabBarLinks pathname={null} />}>
      <ActiveTabBar />
    </Suspense>
  );
}
