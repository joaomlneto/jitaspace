"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import { useSearchActions } from "~/components/Spotlight/useSearchActions";

/**
 * Standalone counterpart to the Spotlight modal, reusing the exact same action
 * logic (`useSearchActions`). It exists primarily as a navigable destination —
 * e.g. the "Search" PWA shortcut and the header search on touch devices — where
 * opening a modal isn't appropriate.
 */
function SearchView() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>(searchParams.get("q") ?? "");
  const { filteredActions, ungrouped, groups } = useSearchActions(query);

  return (
    <Container size="sm">
      <Stack gap="md">
        <Title order={2}>Search</Title>
        <TextInput
          data-autofocus
          autoFocus
          size="md"
          leftSection={<IconSearch size={18} />}
          placeholder="Search characters, corporations, items, tools…"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />

        {filteredActions.length > 0 ? (
          <Stack gap="lg">
            {ungrouped.length > 0 && (
              <SearchActionList actions={ungrouped} />
            )}
            {Object.entries(groups).map(([groupName, groupActions]) => (
              <Stack key={groupName} gap="xs">
                <Text size="xs" tt="uppercase" c="dimmed" fw={700}>
                  {groupName}
                </Text>
                <SearchActionList actions={groupActions} />
              </Stack>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed">No results found</Text>
        )}
      </Stack>
    </Container>
  );
}

function SearchActionList({
  actions,
}: {
  actions: ReturnType<typeof useSearchActions>["filteredActions"];
}) {
  return (
    <Stack gap={4}>
      {actions.map(({ id, label, description, leftSection, onClick }) => (
        <UnstyledButton
          key={id}
          onClick={onClick}
          p="xs"
          style={{ borderRadius: "var(--mantine-radius-sm)" }}
        >
          <Group wrap="nowrap">
            {leftSection}
            <Stack gap={0}>
              <Text>{label}</Text>
              {description && (
                <Text size="xs" c="dimmed">
                  {description}
                </Text>
              )}
            </Stack>
          </Group>
        </UnstyledButton>
      ))}
    </Stack>
  );
}

export default function Page() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}
