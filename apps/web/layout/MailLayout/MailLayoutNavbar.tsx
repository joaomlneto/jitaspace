import React from "react";
import Link from "next/link";
import {
  Badge,
  createStyles,
  Group,
  Loader,
  MediaQuery,
  Navbar,
  rem,
  ScrollArea,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconMailbox, IconMailFast, IconTag } from "@tabler/icons-react";
import { signIn, useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLabels } from "@jitaspace/esi-client";
import { EveMailNeocomIcon, EveMailTagIcon } from "@jitaspace/eve-icons";
import {
  CharacterAvatar,
  LabelName,
  LoginWithEveOnlineButton,
  MailLabelColorSwatch,
} from "@jitaspace/ui";
import { isSpecialLabelId } from "@jitaspace/utils";

import LinksGroup from "./NavbarLinksGroup";
import UserButton from "./UserButton";

export const NAVBAR_WIDTH = 250;

const useStyles = createStyles((theme) => ({
  navbar: {
    backgroundColor:
      theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
    paddingBottom: 0,
  },

  header: {
    padding: theme.spacing.md,
    paddingTop: 0,
    marginLeft: `calc(${theme.spacing.md} * -1)`,
    marginRight: `calc(${theme.spacing.md} * -1)`,
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
    borderBottom: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
  },

  links: {
    marginLeft: `calc(${theme.spacing.md} * -1)`,
    marginRight: `calc(${theme.spacing.md} * -1)`,
  },

  linksInner: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },

  footer: {
    marginLeft: `calc(${theme.spacing.md} * -1)`,
    marginRight: `calc(${theme.spacing.md} * -1)`,
    borderTop: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
    marginBottom: `calc(${theme.spacing.md} * -1)`,
  },
}));

export default function MailLayoutNavbar() {
  const { classes } = useStyles();
  const { data: session, status } = useSession();

  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    session?.user?.id ?? 1,
    undefined,
    {
      swr: {
        enabled: !!session?.user?.id,
      },
    },
  );

  const specialLabels =
    labels?.data.labels?.filter((label) => isSpecialLabelId(label.label_id)) ??
    [];

  const customLabels =
    labels?.data.labels?.filter((label) => !isSpecialLabelId(label.label_id)) ??
    [];

  return (
    <MediaQuery smallerThan="md" styles={{ display: "none" }}>
      <Navbar
        width={{ md: NAVBAR_WIDTH }}
        hiddenBreakpoint="xl"
        p="md"
        className={classes.navbar}
      >
        <Navbar.Section className={classes.header}>
          <Group position="apart">
            <UnstyledButton component={Link} href="/">
              <Group>
                <EveMailNeocomIcon width={32} height={32} alt="EveMail" />
                <Text fw="bold">EveMail</Text>
              </Group>
            </UnstyledButton>
            <Badge>beta</Badge>
          </Group>
        </Navbar.Section>

        <Navbar.Section grow className={classes.links} component={ScrollArea}>
          <div className={classes.linksInner}>
            {status === "authenticated" && (
              <>
                <LinksGroup
                  link="/mail/compose"
                  icon={<IconMailFast size={16} />}
                  label={<Text>Compose</Text>}
                />
                <LinksGroup
                  link="/mail/mailbox"
                  icon={<IconMailbox size={16} />}
                  label={<Text>All Mails</Text>}
                  rightIcon={
                    labels && (
                      <Badge variant="filled">
                        {labels.data.total_unread_count}
                      </Badge>
                    )
                  }
                />
                {specialLabels.map((item, index) => (
                  <LinksGroup
                    key={item.label_id ?? index}
                    link={`/mail/mailbox?labels=${item.label_id}`}
                    icon={
                      <MailLabelColorSwatch labelId={item.label_id} size={16} />
                    }
                    label={<LabelName labelId={item.label_id} />}
                    rightIcon={
                      item.unread_count ? (
                        <Badge variant="filled">{item.unread_count}</Badge>
                      ) : undefined
                    }
                  />
                ))}
                {customLabels.length > 0 && (
                  <LinksGroup
                    icon={
                      <EveMailTagIcon alt="Labels" width={24} height={24} />
                    }
                    label={<Text>Labels</Text>}
                    links={
                      customLabels.map((item, index) => ({
                        key: String(item.label_id ?? index),
                        label: (
                          <Group position="apart">
                            <Group>
                              <MailLabelColorSwatch
                                labelId={item.label_id}
                                size={16}
                              />
                              <Text>{item.name}</Text>
                            </Group>
                            {item.unread_count && (
                              <Badge variant="filled">
                                {item.unread_count}
                              </Badge>
                            )}
                          </Group>
                        ),
                        link: `/mail/mailbox?labels=${item.label_id}`,
                      })) ?? []
                    }
                    initiallyOpened={true}
                  />
                )}
                <LinksGroup
                  icon={<IconMailbox size={16} />}
                  label={<Text>Mailing Lists</Text>}
                  link={"/mail/mailing-lists"}
                />
                <LinksGroup
                  icon={<IconTag size={16} />}
                  label={<Text>Manage Labels</Text>}
                  link={"/mail/manage-labels"}
                />
              </>
            )}
          </div>
        </Navbar.Section>

        <Navbar.Section className={classes.footer}>
          {status === "authenticated" && <UserButton />}
          {status === "unauthenticated" && (
            <LoginWithEveOnlineButton
              width={NAVBAR_WIDTH - 16}
              onClick={() => {
                void signIn("eveonline");
              }}
            />
          )}
          {status === "loading" && (
            <Group p="md">
              <CharacterAvatar characterId={1} radius="xl" />
              <div style={{ flex: 1 }}>
                <Group position="apart">
                  <Text size="sm" weight={500}>
                    Loading...
                  </Text>
                  <Loader size="sm" />
                </Group>
              </div>
            </Group>
          )}
        </Navbar.Section>
      </Navbar>
    </MediaQuery>
  );
}
