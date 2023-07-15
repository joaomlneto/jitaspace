import React, { type ReactElement } from "react";
import {
  Anchor,
  Container,
  Group,
  List,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { Email } from "react-obfuscate-email";

import { CharacterAnchor, CharacterAvatar, CharacterName } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

const MY_CHARACTER_ID = 401563624;

export default function Page() {
  return (
    <Container size="sm">
      <Stack>
        <Title>About</Title>
        <Text>
          This is just a simple website with a few tools for{" "}
          <Anchor href="https://www.eveonline.com" target="_blank">
            EVE Online
          </Anchor>{" "}
          I&apos;ve developed for fun, because I found them useful, and/or to
          learn and play with ESI and web technologies.
        </Text>
        <Text>
          This website respects your privacy: I do not collect any of your EVE
          Online data, nor any personally identifiable information. All data
          collected is completely anonymized — users cannot be identified and
          are never tracked across websites. If your browser is configured to{" "}
          <Anchor href="https://allaboutdnt.com/" target="_blank">
            request to not be tracked
          </Anchor>
          , we will not collect any information. Check the{" "}
          <Anchor href="/privacy">privacy policy</Anchor> for more details on
          what we collect and why/how we use it.
        </Text>
        <Title order={3}>Contact</Title>
        <Text>
          If you have any feedback, questions, bug reports, feature requests or
          other suggestions, feel free to contact me through the following
          channels:
        </Text>
        <Table highlightOnHover>
          <tbody>
            <tr>
              <td>In-game</td>
              <td>
                <Group spacing="xs" noWrap>
                  <CharacterAvatar characterId={MY_CHARACTER_ID} size="sm" />
                  <CharacterAnchor characterId={MY_CHARACTER_ID}>
                    <CharacterName characterId={MY_CHARACTER_ID} />
                  </CharacterAnchor>
                </Group>
              </td>
            </tr>
            <tr>
              <td>Email</td>
              <td>
                <Anchor component={Email} email="joao@jita.space">
                  Click to send email
                </Anchor>
              </td>
            </tr>
          </tbody>
        </Table>
        <Title order={3}>Credits</Title>
        <Text>
          Extremely grateful to all the folks who helped me out with this, both
          people that were willing to test my buggy code in the early stages, to
          all the valuable discussions to the folks on the{" "}
          <Anchor
            href="https://www.fuzzwork.co.uk/tweetfleet-slack-invites/"
            target="_blank"
          >
            Tweetfleet Slack
          </Anchor>{" "}
          and{" "}
          <Anchor href="https://www.eveonline.com/discord" target="_blank">
            EVE Online Discord
          </Anchor>
          . Some special mentions:
          <List my="xs">
            <List.Item>
              Kenn from{" "}
              <Anchor href="https://everef.net" target="_blank">
                Eve Ref
              </Anchor>
              , for putting up with my questions in the early days, for sharing
              his code, and for all the invaluable tips.
            </List.Item>
          </List>
        </Text>
        <Title order={3}>Copyright Notice</Title>
        <Text size="xs">
          EVE Online, the EVE logo, EVE and all associated logos and designs are
          the intellectual property of CCP hf. All artwork, screenshots,
          characters, vehicles, storylines, world facts or other recognizable
          features of the intellectual property relating to these trademarks are
          likewise the intellectual property of CCP hf. EVE Online and the EVE
          logo are the registered trademarks of CCP hf. All rights are reserved
          worldwide. All other trademarks are the property of their respective
          owners. CCP hf. has granted permission to www.jita.space to use EVE
          Online and all associated logos and designs for promotional and
          information purposes on its website but does not endorse, and is not
          in any way affiliated with, www.jita.space. CCP is in no way
          responsible for the content on or functioning of this website, nor can
          it be liable for any damage arising from the use of this website.
        </Text>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
