"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  NavigationProgress,
  nprogress,
  nprogressStore,
  useNprogress,
} from "@mantine/nprogress";

export const RouterTransition = () => {
  const pathname = usePathname();
  const { mounted } = useNprogress(nprogressStore);

  useEffect(() => {
    nprogress.complete();
    return () => {
      nprogress.start();
    };
  }, [pathname]);

  // Mantine leaves the bar's progressbar role unnamed, which every page then
  // fails on (axe/Lighthouse aria-progressbar-name). It is also portalled to
  // <body>, outside every landmark, and stays in the DOM (invisible) between
  // navigations: hide it from assistive technology while idle.
  return (
    <NavigationProgress
      size={5}
      aria-label="Page loading"
      aria-hidden={!mounted}
    />
  );
};
