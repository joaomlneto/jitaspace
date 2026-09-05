import fs from "node:fs";
import path from "node:path";
import { Container, Typography } from "@mantine/core";
import Markdown from "react-markdown";

import { pageMetadata } from "~/lib/metadata";

export const metadata = pageMetadata({
  title: "Changelog",
  description: "What's new in JitaSpace — release notes for every version.",
  path: "/changelog",
  badge: "JitaSpace",
});

export default function ChangelogPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "CHANGELOG.md"),
    "utf-8",
  );

  return (
    <Container size="sm" py="xl">
      <Typography>
        <Markdown>{content}</Markdown>
      </Typography>
    </Container>
  );
}
