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

  return <NavigationProgress size={5} />;
};
