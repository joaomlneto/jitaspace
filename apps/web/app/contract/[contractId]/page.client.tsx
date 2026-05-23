"use client";

import { useParams } from "next/navigation";
import { Container, Stack, Text, Title } from "@mantine/core";

export default function Page() {
  const params = useParams();
  const rawContractId = params?.contractId;
  const contractId =
    typeof rawContractId === "string" ? rawContractId : rawContractId?.[0];

  return (
    <Container size="lg">
      <Stack mt="xl">
        <Title order={3}>Contract #{contractId}</Title>
        <Text c="dimmed">Contract details are not yet available.</Text>
      </Stack>
    </Container>
  );
}
