import fs from "fs";
import path from "path";

import { Container, TypographyStylesProvider } from "@mantine/core";
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
      <TypographyStylesProvider>
        <Markdown>{content}</Markdown>
      </TypographyStylesProvider>
    </Container>
  );
}
