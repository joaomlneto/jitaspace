"use client";

import type { MouseEvent, PropsWithChildren, ReactNode } from "react";
import { createContext, Suspense, use } from "react";
import { Button, Drawer, Loader, useMantineTheme } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconListTree } from "@tabler/icons-react";

import classes from "./MarketLayout.module.css";

/** Opens the market tree's drawer; `null` outside the market layout. */
const MarketDrawerContext = createContext<(() => void) | null>(null);

interface MarketLayoutShellProps extends PropsWithChildren {
  sidebar: ReactNode;
}

/**
 * The market's two-pane layout. From `md` the tree is a sticky sidebar; below
 * that it would push every item page a screen down, so it moves into a drawer
 * that a page opens with {@link BrowseMarketButton}. The `/market` index lists
 * the tree inline on small screens instead, having no item to show yet.
 *
 * Which page is showing is deliberately not read here: `usePathname()` is
 * request data on `/market/[typeId]`, and reading it in the layout, outside the
 * page's Suspense boundary, would block the whole route's render on it.
 */
export const MarketLayoutShell = ({
  children,
  sidebar,
}: MarketLayoutShellProps) => {
  const [drawerOpened, drawer] = useDisclosure(false);
  const theme = useMantineTheme();
  const isWide = useMediaQuery(`(min-width: ${theme.breakpoints.md})`);

  // From md the drawer is only hidden by CSS. Left open (a tablet rotated to
  // landscape), its scroll lock and focus trap would outlive it, invisibly.
  if (isWide && drawerOpened) drawer.close();

  const tree = <Suspense fallback={<Loader />}>{sidebar}</Suspense>;

  // Picking an item navigates; take the drawer away with it. Group rows are
  // buttons, so expanding one keeps the drawer open.
  const closeOnLinkClick = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest("a[href]")) {
      drawer.close();
    }
  };

  return (
    <MarketDrawerContext value={drawer.open}>
      <div className={classes.root}>
        <aside className={classes.sidebar} aria-label="Market groups">
          {tree}
        </aside>
        <div className={classes.content}>{children}</div>
        <Drawer
          opened={drawerOpened}
          onClose={drawer.close}
          title="Market"
          size="85%"
          hiddenFrom="md"
          // Focus the close button, not the search: focusing an input pops the
          // phone keyboard up over the tree the drawer was opened to browse.
          closeButtonProps={{ "data-autofocus": true } as object}
        >
          <div onClickCapture={closeOnLinkClick}>{tree}</div>
        </Drawer>
      </div>
    </MarketDrawerContext>
  );
};

/** Opens the market tree on screens too narrow for the sidebar. */
export function BrowseMarketButton() {
  const openDrawer = use(MarketDrawerContext);
  if (!openDrawer) return null;

  return (
    <Button
      hiddenFrom="md"
      fullWidth
      variant="light"
      leftSection={<IconListTree size={18} />}
      onClick={openDrawer}
    >
      Browse market
    </Button>
  );
}
