"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavigationProgress, nprogress } from "@mantine/nprogress";

export const RouterTransition = () => {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    nprogress.complete();
    return () => {
      nprogress.start();
    };
  }, [pathname]);

  return <NavigationProgress size={5} />;
};
