import React from "react";
import { Accordion, Group, List, Stack, Text, Title } from "@mantine/core";

import { CharacterAvatar } from "@jitaspace/ui";

export function EveMailFaqAccordion() {
  return (
    <Accordion variant="separated" p="xl">
      <Accordion.Item value="about">
        <Accordion.Control>
          <Title order={4}>What is this website?</Title>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack>
            <Text>
              This is a simple website to allow you to view your EVE Online
              correspondence whilst out of the game. This was a weekend project
              to learn a bit more about Next.js and React. It is not perfect,
              but it works. Let me know if something is broken!
            </Text>
            <Group spacing="xl" pl="xl" position="right" mr="xl" pr="xl">
              <CharacterAvatar characterId={401563624} radius="xl" />
              <Text>Joao Neto</Text>
            </Group>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
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
              Fix message formatting, both when composing messages, as well as
              viewing messages.
            </List.Item>
            <List.Item>
              Add privacy controls: if you just want to read emails, you should
              be able to just give enough scopes to do that.
            </List.Item>
            <List.Item>
              Reduce API calls to ESI, as it is currently quite slow.
            </List.Item>
            <List.Item>
              Improve the list of recipients when composing a message. Replace
              the current Select component with a MultiSelect component.
            </List.Item>
          </List>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="legal">
        <Accordion.Control>
          <Title order={4}>Legal Notice</Title>
        </Accordion.Control>
        <Accordion.Panel>
          <Text>
            EVE Online and the EVE logo are the registered trademarks of CCP hf.
            All rights are reserved worldwide. All other trademarks are the
            property of their respective owners. EVE Online, the EVE logo, EVE
            and all associated logos and designs are the intellectual property
            of CCP hf. All artwork, screenshots, characters, vehicles,
            storylines, world facts or other recognizable features of the
            intellectual property relating to these trademarks are likewise the
            intellectual property of CCP hf. CCP hf. has granted permission to
            Jita to use EVE Online and all associated logos and designs for
            promotional and information purposes on its website but does not
            endorse, and is not in any way affiliated with, Jita. CCP is in no
            way responsible for the content on or functioning of this website,
            nor can it be liable for any damage arising from the use of this
            website.
          </Text>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
