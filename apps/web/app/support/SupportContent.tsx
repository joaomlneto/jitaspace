"use client";

import Link from "next/link";
import {
  Anchor,
  Button,
  Card,
  Code,
  Container,
  Divider,
  Group,
  List,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconBrandDiscordFilled,
  IconBrandGithub,
  IconBuildingStore,
  IconCoffee,
  IconCoins,
  IconGift,
  IconHeartHandshake,
  IconMessageReport,
  IconShoppingBag,
} from "@tabler/icons-react";

import {
  CharacterAnchor,
  CharacterAvatar,
  CharacterName,
  CorporationAnchor,
  CorporationAvatar,
  CorporationName,
} from "@jitaspace/ui";

import { env } from "~/env";

/**
 * The EVE Online creator code used to support the project. Entering it at the EVE
 * Store checkout earns JitaSpace a revenue share at no extra cost to the buyer.
 */
const CREATOR_CODE = "JITA";

/** In-game corporation that receives community ISK donations (giveaways/events). */
const DONATION_CORPORATION_ID = 98832245;

/** My in-game character, for personal ISK donations. */
const MY_CHARACTER_ID = 401563624;

/**
 * External destinations. Note: GitHub Sponsors must be enabled on the account
 * before that link resolves.
 */
const links = {
  // The creator code is entered at the payment step on the EVE Online Store.
  eveStore: "https://store.eveonline.com/",
  // Markee Dragon affiliate link — auto-attributes the sale (CCP-authorized reseller).
  markeeDragon: "https://store.markeedragon.com/affiliate.php?id=1213",
  github: "https://github.com/joaomlneto/jitaspace",
  // Pre-filled "new issue" picker (bug / feature templates).
  feedback: "https://github.com/joaomlneto/jitaspace/issues/new/choose",
  githubSponsors: "https://github.com/sponsors/joaomlneto", // needs GitHub Sponsors enabled on the account
  buyMeACoffee: "https://buymeacoffee.com/joaomlneto",
};

export function SupportContent() {
  return (
    <Container size="sm">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title>Support JitaSpace</Title>
          <Text size="sm">
            JitaSpace is a collection of EVE Online tools I build in my spare
            time, for the love of the game. If you&apos;ve found it useful and
            would like to give something back, here are a few ways to help —
            there&apos;s no obligation at all, and the free options below help
            just as much.
          </Text>
        </Stack>

        {/* ---- Free ways to help ---- */}
        <Stack gap="xs">
          <Title order={3}>Free ways to help</Title>
          <Text size="sm">The most valuable support costs nothing at all:</Text>
          <Group>
            <Button
              component="a"
              href={env.NEXT_PUBLIC_DISCORD_INVITE_LINK}
              target="_blank"
              variant="light"
              leftSection={<IconBrandDiscordFilled size={18} />}
            >
              Join the Discord
            </Button>
            <Button
              component="a"
              href={links.feedback}
              target="_blank"
              variant="light"
              leftSection={<IconMessageReport size={18} />}
            >
              Give feedback
            </Button>
            <Button
              component="a"
              href={links.github}
              target="_blank"
              variant="light"
              leftSection={<IconBrandGithub size={18} />}
            >
              Star on GitHub
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            Spreading the word helps just as much — tell your corp, alliance, or
            friends. Word of mouth is everything for a small project.
          </Text>
        </Stack>

        {/* ---- Shop with creator code ---- */}
        <Stack gap="xs">
          <Title order={3}>Buy PLEX, Omega &amp; game time</Title>
          <Text size="sm">
            Topping up anyway? Use my EVE creator code{" "}
            <Code>{CREATOR_CODE}</Code> or my Markee Dragon link below, and a
            share of your purchase comes back to JitaSpace — at no extra cost to
            you.
          </Text>
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <Card withBorder padding="md">
              <Stack gap="xs" h="100%" justify="space-between">
                <Stack gap="xs">
                  <Group gap="xs">
                    <ThemeIcon variant="light" size="lg">
                      <IconBuildingStore size={20} />
                    </ThemeIcon>
                    <Text fw={600}>EVE Online Store</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Enter creator code <Code>{CREATOR_CODE}</Code> at the
                    payment step. It doesn&apos;t change your price — it just
                    sends a 5% revenue share my way.
                  </Text>
                </Stack>
                <Button
                  component="a"
                  href={links.eveStore}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  variant="light"
                  fullWidth
                >
                  Open the EVE Store
                </Button>
              </Stack>
            </Card>
            <Card withBorder padding="md">
              <Stack gap="xs" h="100%" justify="space-between">
                <Stack gap="xs">
                  <Group gap="xs">
                    <ThemeIcon variant="light" size="lg">
                      <IconShoppingBag size={20} />
                    </ThemeIcon>
                    <Text fw={600}>Markee Dragon</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    An official, CCP-authorized reseller of PLEX, Omega, and
                    game time — often cheaper than buying direct. Shopping
                    through my affiliate link sends a commission my way.
                  </Text>
                </Stack>
                <Button
                  component="a"
                  href={links.markeeDragon}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  variant="light"
                  fullWidth
                >
                  Open Markee Dragon
                </Button>
              </Stack>
            </Card>
          </SimpleGrid>
          <Text size="xs" c="dimmed">
            Affiliate disclosure: the code and link above are affiliate
            referrals — when you use them I receive a commission or revenue
            share, at no extra cost to you. See the fine print below.
          </Text>
        </Stack>

        {/* ---- Sponsor development ---- */}
        <Stack gap="xs">
          <Title order={3}>Sponsor development</Title>
          <Text size="sm">
            Prefer to chip in directly? This helps cover hosting, server, and
            API costs. One-off or recurring — whatever suits you.
          </Text>
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <Card withBorder padding="md">
              <Stack gap="xs" h="100%" justify="space-between">
                <Stack gap="xs">
                  <Group gap="xs">
                    <ThemeIcon variant="light" size="lg">
                      <IconHeartHandshake size={20} />
                    </ThemeIcon>
                    <Text fw={600}>GitHub Sponsors</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Sponsor the open-source project monthly or one-time. 100%
                    reaches the project — GitHub takes no platform fee.
                  </Text>
                </Stack>
                <Button
                  component="a"
                  href={links.githubSponsors}
                  target="_blank"
                  variant="light"
                  fullWidth
                  leftSection={<IconBrandGithub size={18} />}
                >
                  Become a sponsor
                </Button>
              </Stack>
            </Card>
            <Card withBorder padding="md">
              <Stack gap="xs" h="100%" justify="space-between">
                <Stack gap="xs">
                  <Group gap="xs">
                    <ThemeIcon variant="light" size="lg">
                      <IconCoffee size={20} />
                    </ThemeIcon>
                    <Text fw={600}>Buy Me a Coffee</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    A quick one-off tip — no account or subscription needed.
                  </Text>
                </Stack>
                <Button
                  component="a"
                  href={links.buyMeACoffee}
                  target="_blank"
                  variant="light"
                  fullWidth
                  leftSection={<IconCoffee size={18} />}
                >
                  Buy me a coffee
                </Button>
              </Stack>
            </Card>
          </SimpleGrid>
        </Stack>

        {/* ---- ISK ---- */}
        <Stack gap="xs">
          <Title order={3}>Send ISK in-game</Title>
          <Card withBorder padding="md">
            <Group wrap="nowrap" align="flex-start" gap="md">
              <ThemeIcon variant="light" size="xl">
                <IconCoins size={24} />
              </ThemeIcon>
              <Stack gap="xs">
                <Text size="sm">
                  Rich in ISK but not in spare euros? You can support the
                  project directly in-game. For community donations, send ISK to
                  the corporation:
                </Text>
                <Group gap="xs" wrap="nowrap" align="center">
                  <CorporationAvatar
                    corporationId={DONATION_CORPORATION_ID}
                    size="sm"
                  />
                  <CorporationAnchor
                    corporationId={DONATION_CORPORATION_ID}
                    size="sm"
                    fw={600}
                  >
                    <CorporationName corporationId={DONATION_CORPORATION_ID} />
                  </CorporationAnchor>
                </Group>
                <Text size="sm">
                  …or to my character, for a personal donation:
                </Text>
                <Group gap="xs" wrap="nowrap" align="center">
                  <CharacterAvatar characterId={MY_CHARACTER_ID} size="sm" />
                  <CharacterAnchor
                    characterId={MY_CHARACTER_ID}
                    size="sm"
                    fw={600}
                  >
                    <CharacterName characterId={MY_CHARACTER_ID} />
                  </CharacterAnchor>
                </Group>
                <Group gap="xs" wrap="nowrap" align="flex-start">
                  <ThemeIcon variant="transparent" color="gray" size="sm">
                    <IconGift size={16} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed">
                    ISK sent to the corporation goes straight back to the
                    community — mostly giveaways and events. It&apos;s a
                    voluntary in-game gift, never exchanged for real money or
                    site features.
                  </Text>
                </Group>
              </Stack>
            </Group>
          </Card>
        </Stack>

        <Divider />

        {/* ---- Disclosures ---- */}
        <Stack gap="xs">
          <Title order={3}>Disclosures &amp; the fine print</Title>
          <List size="sm" spacing="xs">
            <List.Item>
              JitaSpace is an independent, third-party project. It is not
              affiliated with, sponsored by, or endorsed by{" "}
              <Anchor
                inherit
                href="https://fenriscreations.com"
                target="_blank"
              >
                Fenris Creations
              </Anchor>
              . My affiliate relationships with the EVE Store and Markee Dragon
              are disclosed below.
            </List.Item>
            <List.Item>
              The EVE Online creator code and the Markee Dragon link are
              affiliate referrals. If you use them, I receive a commission or
              revenue share from the respective store — this never costs you any
              more than the normal price.
            </List.Item>
            <List.Item>
              ISK you choose to send is treated as a voluntary in-game gift and
              is used for community activities such as giveaways. ISK is never
              bought, sold, or exchanged for real money — doing so would violate
              the EVE Online EULA.
            </List.Item>
            <List.Item>
              Payments are handled entirely by the respective platforms (the EVE
              Store, Markee Dragon, GitHub, Buy Me a Coffee, …). JitaSpace does
              not process or store any of your payment information. See the{" "}
              <Anchor inherit component={Link} href="/about">
                About page
              </Anchor>{" "}
              for the full privacy policy.
            </List.Item>
          </List>
        </Stack>
      </Stack>
    </Container>
  );
}
