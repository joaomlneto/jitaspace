import fs from "node:fs";
import path from "node:path";
import { Container, Typography } from "@mantine/core";
import Markdown from "react-markdown";

export const metadata = {
  title: "Changelog",
};

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
