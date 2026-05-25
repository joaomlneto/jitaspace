import fs from "fs";
import path from "path";

import { Anchor, Container, List, Stack, Text, Title } from "@mantine/core";
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
      <Markdown
        components={{
          h1: ({ children }) => (
            <Title order={1} mb="lg">
              {children}
            </Title>
          ),
          h2: ({ children }) => (
            <Title order={2} mt="xl" mb="xs">
              {children}
            </Title>
          ),
          h3: ({ children }) => (
            <Title order={4} mt="md" mb={4} c="dimmed" fw={500}>
              {children}
            </Title>
          ),
          p: ({ children }) => <Text size="sm">{children}</Text>,
          ul: ({ children }) => (
            <List size="sm" withPadding>
              {children}
            </List>
          ),
          li: ({ children }) => <List.Item>{children}</List.Item>,
          a: ({ href, children }) => (
            <Anchor href={href} size="sm">
              {children}
            </Anchor>
          ),
          // Wrap everything in a Stack for consistent spacing
          section: ({ children }) => <Stack gap="xs">{children}</Stack>,
        }}
      >
        {content}
      </Markdown>
    </Container>
  );
}
