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

  // The bar is portalled to <body>, outside every landmark, and stays in the
  // DOM (invisible) between navigations: hide it from assistive technology
  // while idle, and name it while a page is loading.
  return (
    <NavigationProgress
      size={5}
      aria-label="Page loading"
      aria-hidden={!mounted}
    />
  );
};
