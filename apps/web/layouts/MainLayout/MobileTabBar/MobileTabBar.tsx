"use client";

import type { TablerIcon } from "@tabler/icons-react";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Text } from "@mantine/core";
import {
  IconHome,
  IconMap,
  IconSearch,
  IconShoppingCart,
} from "@tabler/icons-react";

import classes from "./MobileTabBar.module.css";

interface Tab {
  label: string;
  href: string;
  Icon: TablerIcon;
  /** Marks the tab active when the pathname starts with one of these. */
  match: string[];
}

// A small, thumb-reachable set of top destinations. The full navigation stays
// available via the header burger menu. All of these work without logging in.
const tabs: Tab[] = [
  { label: "Home", href: "/", Icon: IconHome, match: ["/"] },
  { label: "Search", href: "/search", Icon: IconSearch, match: ["/search"] },
  {
    label: "Market",
    href: "/market",
    Icon: IconShoppingCart,
    match: ["/market"],
  },
  {
    label: "Map",
    href: "/regions",
    Icon: IconMap,
    match: ["/regions", "/region"],
  },
];

function isActive(pathname: string | null, tab: Tab): boolean {
  if (tab.href === "/") return pathname === "/";
  return tab.match.some((prefix) => pathname?.startsWith(prefix));
}

function TabBarLinks({ pathname }: Readonly<{ pathname: string | null }>) {
  return (
    <nav className={classes.bar} aria-label="Primary">
      {tabs.map((tab) => {
        const active = isActive(pathname, tab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={classes.tab}
            data-active={active || undefined}
            aria-current={active ? "page" : undefined}
          >
            <tab.Icon size={22} stroke={1.6} />
            <Text size="0.625rem" fw={500} className={classes.label}>
              {tab.label}
            </Text>
          </Link>
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
