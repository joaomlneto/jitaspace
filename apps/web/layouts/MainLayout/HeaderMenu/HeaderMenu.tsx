"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Burger, Container, Group, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { openContextModal } from "@mantine/modals";

import { useAuthenticatedCharacterIds } from "@jitaspace/hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { ServerStatusIndicator } from "~/components/ServerStatus/ServerStatusIndicator";
import { jitaApps } from "~/config/apps";
import UserButton from "~/layouts/MainLayout/UserButton";
import { DesktopNavMenu } from "./DesktopNavMenu";
import classes from "./HeaderMenu.module.css";
import { HeaderSearchButton } from "./HeaderSearchButton";
import { MobileNavDrawer } from "./MobileNavDrawer";

/**
 * The nav group that owns the current route, chosen by the longest matching app
 * URL (so /wallet/corporation lights up Corporation, not Character). Falls back
 * to the first path segment for apps whose configured URL is a deeper default,
 * so e.g. Travel's "/travel/jita/amarr" still matches any /travel/* page.
 * Returns null on routes no group owns (e.g. the home page).
 */
function activeGroupName(pathname: string): string | null {
  let bestLen = 0;
  let bestName: string | null = null;
  for (const group of Object.values(jitaApps)) {
    for (const app of Object.values(group.apps)) {
      if (!app.url) continue;
      const segment = `/${app.url.split("/")[1] ?? ""}`;
      let len = 0;
      if (pathname === app.url || pathname.startsWith(`${app.url}/`)) {
        len = app.url.length;
      } else if (
        segment.length > 1 &&
        (pathname === segment || pathname.startsWith(`${segment}/`))
      ) {
        len = segment.length;
      }
      if (len > bestLen) {
        bestLen = len;
        bestName = group.name;
      }
    }
  }
  return bestName;
}

/**
 * Top navigation header for the MainLayout. Labelled "mega menu"-style
 * dropdowns (Character / Corporation / Alliance / Universe) replace the older
 * icon-only triggers, alongside a Spotlight-backed search box and the character
 * menu. Responsive: trigger labels and the full search box appear on wider
 * screens, and it collapses to a burger + full-screen drawer below `sm`.
 */
export function HeaderMenu() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const characterIds = useAuthenticatedCharacterIds();
  const pathname = usePathname();
  const activeName = useMemo(() => activeGroupName(pathname), [pathname]);

  return (
    <Box h="100%" px="md">
      <div className={classes.header}>
        <Container size="xl" h={60} p={0}>
          <Group justify="space-between" h="100%" gap="xs" wrap="nowrap">
            <Group h="100%" gap="lg" wrap="nowrap">
              <Group h="100%" gap="sm" wrap="nowrap">
                <Link href="/" className={classes.logo}>
                  <Image
                    src="/logo.png"
                    alt="Jita logo"
                    width={32}
                    height={32}
                  />
                </Link>
                <ServerStatusIndicator />
              </Group>

              <Group h="100%" gap={2} visibleFrom="sm" wrap="nowrap">
                {Object.values(jitaApps).map((group) => (
                  <DesktopNavMenu
                    key={group.name}
                    label={group.name}
                    Icon={group.Icon}
                    apps={group.apps}
                    active={group.name === activeName}
                  />
                ))}
              </Group>
            </Group>

            <Group gap="xs" visibleFrom="sm" wrap="nowrap">
              <HeaderSearchButton />
              {characterIds.length > 0 && <UserButton />}
              {characterIds.length === 0 && (
                <LoginWithEveOnlineButton
                  size="small"
                  onClick={() => {
                    openContextModal({
                      modal: "login",
                      title: <Title order={3}>Login</Title>,
                      size: "xl",
                      centered: false,
                      innerProps: {},
                    });
                  }}
                />
              )}
            </Group>

            <Burger
              opened={drawerOpened}
              onClick={toggleDrawer}
              hiddenFrom="sm"
            />
          </Group>
        </Container>
      </div>
      <MobileNavDrawer opened={drawerOpened} close={closeDrawer} />
    </Box>
  );
}
