"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { NavigationProgress, nprogress } from "@mantine/nprogress";

export const RouterTransition = () => {
  const pathname = usePathname();

  useEffect(() => {
    nprogress.complete();
    return () => {
      nprogress.start();
    };
  }, [pathname]);

  // Mantine leaves the bar's progressbar role unnamed, which every page then
  // fails on (axe/Lighthouse aria-progressbar-name).
  return <NavigationProgress size={5} aria-label="Page loading" />;
};
