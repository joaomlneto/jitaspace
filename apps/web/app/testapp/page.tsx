import React from "react";

import { LPTable } from "./LPTable";

export const metadata = {
  title: "Testing Page",
  description: "This is the testing page!",
};

export default function HomePage() {
  return (
    <>
      <p>This is the app directory! Woohoo!</p>
      <LPTable />
    </>
  );
}
