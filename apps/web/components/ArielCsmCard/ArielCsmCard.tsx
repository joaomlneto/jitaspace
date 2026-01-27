import {
  Accordion,
  Anchor,
  Blockquote,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconExternalLink } from "@tabler/icons-react";

import { CharacterAvatar } from "@jitaspace/ui";

export const ArielCsmCard = () => {
  const [_visible, _setVisible] = useLocalStorage<boolean>({
    key: "jitaspace/show-ariel-csm-card",
    defaultValue: true,
  });
  return (
    <Accordion variant="separated" radius="md">
      <Accordion.Item value="csm19-ariel-rin">
        <Accordion.Control>
          <Group wrap="nowrap">
            <CharacterAvatar characterId={90406623} size={64} />
            <Stack gap={0}>
              <Text size="lg" fw={900}>
                Ariel Rin for CSM19
              </Text>
              <Anchor
                href="https://community.eveonline.com/community/csm/vote"
                target="_blank"
                size="sm"
              >
                <Group gap={6}>
                  <IconExternalLink size={14} />
                  Cast your CSM votes here
                </Group>
              </Anchor>
            </Stack>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="sm">
            <Blockquote cite="– Ariel Rin" mx="xl" p="sm" mb="md">
              CCP and Third Party Developers used to have a mutual goal of
              designing safe and effective tools, and it’s been my constant
              struggle to reignite that professional relationship for the
              benefit of all players. I’m running for CSM to bring ESI
              development back to a reliable, safe and game design approved
              state, in order to continue to push the envelope on community and
              social engagement in EVE.
            </Blockquote>
            <Text>
              The ESI API, provided by CCP, is the source of all the data for
              the tools we rely on, such as{" "}
              <Anchor href="https://zkillboard.com/" target="_blank">
                zKillboard
              </Anchor>
              ,{" "}
              <Anchor href="https://everef.net" target="_blank">
                EVE Ref
              </Anchor>
              ,{" "}
              <Anchor href="https://www.fuzzwork.co.uk/" target="_blank">
                Fuzzworks
              </Anchor>
              ,{" "}
              <Anchor href="https://eve.nikr.net/jeveasset" target="_blank">
                jEveAssets
              </Anchor>
              ,{" "}
              <Anchor
                href="https://gitlab.com/allianceauth/allianceauth"
                target="_blank"
              >
                Alliance Auth
              </Anchor>
              ,{" "}
              <Anchor
                onClick={() => {
                  showNotification({
                    title: "Hi there!",
                    message: "This is JitaSpace! :-)",
                  });
                }}
              >
                JitaSpace
              </Anchor>
              ,{" "}
              <Anchor href="https://eve-kill.com" target="_blank">
                EVE-KILL
              </Anchor>
              ,{" "}
              <Anchor href="https://www.adam4eve.eu" target="_blank">
                Adam4EVE
              </Anchor>
              ,{" "}
              <Anchor href="https://evetycoon.com" target="_blank">
                EVE Tycoon
              </Anchor>
              ,{" "}
              <Anchor href="https://mokaam.dk" target="_blank">
                Mokaam
              </Anchor>
              ,{" "}
              <Anchor
                href="https://appsource.microsoft.com/en-us/product/office/WA200005228?tab=Overview"
                target="_blank"
              >
                Excel Plugin
              </Anchor>
              , and many more. Unfortunately, this vital resource has been
              neglected for far too long. Without it, all of these tools will
              cease to function. If you tried to view your EveMail recently,
              chances are you were met with an error message due to the ESI
              being down.
            </Text>
            <Text>
              Ariel Rin has been advocating for the revitalization of the ESI. I
              hope you will consider them as the #1 choice on your ballot. You
              can vote for CSM from October 17th until October 24th.
            </Text>
            <Anchor
              href="https://forums.eveonline.com/t/ariel-rin-for-csm19/462992"
              target="_blank"
            >
              <Group gap={6}>
                <IconExternalLink size={14} />
                Ariel Rin CSM19 Campaign Forum Thread
              </Group>
            </Anchor>
            <Anchor
              href="https://www.eveonline.com/news/view/csm-19-shaping-the-future-of-new-eden"
              target="_blank"
            >
              <Group gap={6}>
                <IconExternalLink size={14} />
                Official CSM19 Announcement Page
              </Group>
            </Anchor>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};
