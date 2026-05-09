import { Container } from "@mantine/core";

import { SettingsCard } from "~/components/Settings/SettingsCard";

export default function SettingsPage() {
  return (
    <Container size="md" py="md">
      <SettingsCard />
    </Container>
  );
}
