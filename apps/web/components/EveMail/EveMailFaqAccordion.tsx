import React from "react";
import { Accordion, List, Stack, Text, Title } from "@mantine/core";

export function EveMailFaqAccordion() {
  return (
    <Accordion variant="separated" p="xl">
      <Accordion.Item value="privacy">
        <Accordion.Control>
          <Title order={4}>Can you see my emails?</Title>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack>
            <Text fw="bold">TL;DR: No.</Text>
            <Text>
              Your data is stored in your browser, and is not sent to the
              server. The token travels encrypted to the server just to be
              decrypted and returned to you. The server does not store the
              token, nor does it use it in any way other than to decrypt it and
              return it to you.
            </Text>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="roadmap">
        <Accordion.Control>
          <Title order={4}>Roadmap</Title>
        </Accordion.Control>
        <Accordion.Panel>
          <List>
            <List.Item>
              Fix message formatting when composing messages
            </List.Item>
          </List>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
