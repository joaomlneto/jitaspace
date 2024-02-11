"use client";

import React, { PropsWithChildren } from "react";
import { SessionProvider } from "next-auth/react";





export const MySessionProvider = ({ children }: PropsWithChildren) => {
  return <SessionProvider>{children}</SessionProvider>;
};
