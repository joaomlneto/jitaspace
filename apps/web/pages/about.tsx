import React, { type ReactElement } from "react";
import {
  ActionIcon,
  Anchor,
  Container,
  Group,
  List,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconBrandDiscordFilled } from "@tabler/icons-react";
import { NextSeo } from "next-seo";
import { Email } from "react-obfuscate-email";

import { CharacterAnchor, CharacterAvatar, CharacterName } from "@jitaspace/ui";

import { env } from "~/env.mjs";
import { MainLayout } from "~/layouts";


const MY_CHARACTER_ID = 401563624;

export default function Page() {
  return (
    <Container size="sm">
      <Stack spacing="xs">
        <Title>About</Title>
        <Text size="sm">
          This is just a simple website with a few tools for{" "}
          <Anchor href="https://www.eveonline.com" target="_blank">
            EVE Online
          </Anchor>{" "}
          I&apos;ve developed for fun, because I found them useful, and/or to
          learn and play with ESI and web technologies.
        </Text>
        <Text size="sm">
          If you have any feedback, questions, bug reports, feature requests or
          other suggestions, feel free to contact me through the following
          channels:
        </Text>
        <Table highlightOnHover fontSize="sm">
          <tbody>
            <tr>
              <td>In-game</td>
              <td align="right">
                <Group position="right" spacing="xs" wrap="nowrap">
                  <CharacterAvatar characterId={MY_CHARACTER_ID} size="sm" />
                  <CharacterAnchor
                    characterId={MY_CHARACTER_ID}
                    target="_blank"
                  >
                    <CharacterName characterId={MY_CHARACTER_ID} />
                  </CharacterAnchor>
                </Group>
              </td>
            </tr>
            <tr>
              <td>Discord</td>
              <td align="right">
                <ActionIcon
                  component="a"
                  href={env.NEXT_PUBLIC_DISCORD_INVITE_LINK}
                  target="_blank"
                  size="sm"
                  variant="light"
                >
                  <IconBrandDiscordFilled />
                </ActionIcon>
              </td>
            </tr>
            <tr>
              <td>Email</td>
              <td align="right">
                <Anchor component={Email} email="joao@jita.space">
                  Click to send email
                </Anchor>
              </td>
            </tr>
          </tbody>
        </Table>
        <Title order={3}>Privacy Policy</Title>
        <Text size="sm">
          We do not collect any of your EVE Online data, nor any personally
          identifiable information. All data collected is anonymized — users
          cannot be identified and are never tracked across websites. We collect
          data for functional and statistical reasons only:
        </Text>
        <List size="sm">
          <List.Item>
            We collect the usual information (IP, browser, URL, location, date)
            for statistical purposes. Information is processed and stored by{" "}
            <Anchor href="https://www.umami.is/" target="_blank">
              Umami Cloud
            </Anchor>
            , a privacy-focused web analytics service. The information collected
            is anonymized - users cannot be identified and are never tracked
            across websites.
          </List.Item>
          <List.Item>
            We use cookies and local storage to store your authentication and
            preferences data.
          </List.Item>
          <List.Item>
            Your EVE user information (EVE SSO access tokens, character data) is
            not stored and is used exclusively for interactions with the EVE
            Online Login and API services, both managed by{" "}
            <Anchor href="https://www.ccpgames.com/" target="_blank">
              CCP Games
            </Anchor>
            .
          </List.Item>
        </List>
        <Title order={3}>Acknowledgements</Title>
        <Text size="sm">
          Extremely grateful to all the folks who helped me out with this, both
          people that were willing to test my buggy code in the early stages, to
          all the valuable discussions with the folks at the{" "}
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
        </Text>
        <List size="sm">
          <List.Item>
            <CharacterAnchor characterId={90506825} target="_blank">
              Inomares
            </CharacterAnchor>{" "}
            for{" "}
            <Anchor href="https://www.hoboleaks.space" target="_blank">
              Hoboleaks
            </Anchor>{" "}
            and his diligence in helping fellow third party developers.
          </List.Item>
          <List.Item>
            Kenn from{" "}
            <Anchor href="https://everef.net" target="_blank">
              Eve Ref
            </Anchor>
            , for putting up with my questions, for sharing his code, and for
            all the invaluable tips.
          </List.Item>
          <List.Item>
            <CharacterAnchor characterId={2113325640} target="_blank">
              Nyx Viliana
            </CharacterAnchor>{" "}
            and the{" "}
            <Anchor href="https://42outunis.com" target="_blank">
              The Outuni Project
            </Anchor>{" "}
            incursions community, for some cool ideas and all the ISK.
          </List.Item>
        </List>
        <Text size="sm">
          Written in{" "}
          <Anchor href="https://www.typescriptlang.org/" target="_blank">
            TypeScript
          </Anchor>
          , built with{" "}
          <Anchor href="https://nextjs.org" target="_blank">
            Next.js
          </Anchor>{" "}
          and hosted on{" "}
          <Anchor href="https://vercel.com" target="_blank">
            Vercel
          </Anchor>
          , powered by numerous open source libraries, such as:
        </Text>
        <List size="sm">
          <List.Item>
            <Anchor href="https://axios-http.com/" target="_blank">
              axios
            </Anchor>
          </List.Item>
          <List.Item>
            <Anchor href="https://date-fns.org/" target="_blank">
              date-fns
            </Anchor>
          </List.Item>
          <List.Item>
            <Anchor href="https://github.com/panva/jose" target="_blank">
              jose
            </Anchor>
          </List.Item>
          <List.Item>
            <Anchor href="https://mantine.dev" target="_blank">
              Mantine
            </Anchor>
          </List.Item>
          <List.Item>
            <Anchor href="https://ducanh-next-pwa.vercel.app/" target="_blank">
              next-pwa
            </Anchor>
          </List.Item>
          <List.Item>
            <Anchor href="https://react.dev/" target="_blank">
              React
            </Anchor>
          </List.Item>
          <List.Item>
            <Anchor href="https://swr.vercel.app/" target="_blank">
              SWR
            </Anchor>
          </List.Item>
          <List.Item>
            <Anchor href="https://tabler-icons.io/" target="_blank">
              Tabler Icons
            </Anchor>
          </List.Item>
          <List.Item>
            <Anchor href="https://tanstack.com/" target="_blank">
              TanStack
            </Anchor>
          </List.Item>
          <List.Item>
            <Anchor href="https://tiptap.dev/" target="_blank">
              Tiptap
            </Anchor>
          </List.Item>
        </List>
        <Text size="sm">…and many others!</Text>
        <Text size="sm">
          The source code for this website is open-source and available on{" "}
          <Anchor
            href="https://github.com/joaomlneto/jitaspace"
            target="_blank"
          >
            GitHub
          </Anchor>
          .
        </Text>
        <Title order={3}>Copyright Notice</Title>
        <Text size="sm">
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
  return (
    <MainLayout>
      <NextSeo title="About" />
      {page}
    </MainLayout>
  );
};
