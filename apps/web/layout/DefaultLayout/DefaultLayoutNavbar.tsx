import {
  Badge,
  createStyles,
  Group,
  Loader,
  Navbar,
  ScrollArea,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconMailbox, IconMailFast, IconTag } from "@tabler/icons";
import UserButton from "./UserButton";
import LinksGroup from "./NavbarLinksGroup";
import { signIn, useSession } from "next-auth/react";
import { LoginWithEveOnlineButton } from "../../components/Button";
import { useGetCharactersCharacterIdMailLabels } from "../../esi/mail";
import { CharacterAvatar } from "../../components/Avatar";
import React from "react";
import Image from "next/image";
import { LabelColorSwatch } from "../../components/ColorSwatch";
import Link from "next/link";
import { LabelNameText } from "../../components/Text";
import { isSpecialLabelId } from "../../utils/esi";

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
    marginLeft: -theme.spacing.md,
    marginRight: -theme.spacing.md,
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
    borderBottom: `1px solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
  },

  links: {
    marginLeft: -theme.spacing.md,
    marginRight: -theme.spacing.md,
  },

  linksInner: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },

  footer: {
    marginLeft: -theme.spacing.md,
    marginRight: -theme.spacing.md,
    borderTop: `1px solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
    marginBottom: -theme.spacing.md,
  },
}));

export default function DefaultLayoutNavbar() {
  const { classes, theme } = useStyles();
  const { data: session, status } = useSession();

  const { data: labels } = useGetCharactersCharacterIdMailLabels(
    session?.user?.id ?? 1,
    undefined,
    {
      swr: {
        enabled: !!session?.user?.id,
      },
    }
  );

  const specialLabels =
    labels?.data.labels?.filter((label) => isSpecialLabelId(label.label_id)) ??
    [];

  const customLabels =
    labels?.data.labels?.filter((label) => !isSpecialLabelId(label.label_id)) ??
    [];

  return (
    <Navbar width={{ sm: NAVBAR_WIDTH }} p="md" className={classes.navbar}>
      <Navbar.Section className={classes.header}>
        <Group position="apart">
          <UnstyledButton component={Link} href="/">
            <Group>
              <Image
                src="/icons/evemail.png"
                width={32}
                height={32}
                alt="EveMail"
              />
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
                link="/compose"
                icon={<IconMailFast size={16} />}
                label={<Text>Compose</Text>}
              />
              <LinksGroup
                link="/mailbox"
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
                  link={`/mailbox?labels=${item.label_id}`}
                  icon={<LabelColorSwatch labelId={item.label_id} size={16} />}
                  label={<LabelNameText labelId={item.label_id} />}
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
                    <Image
                      src={"/icons/evemailtag.png"}
                      alt="Labels"
                      width={24}
                      height={24}
                    />
                  }
                  label={<Text>Labels</Text>}
                  links={
                    customLabels.map((item, index) => ({
                      key: String(item.label_id ?? index),
                      label: (
                        <Group position="apart">
                          <Group>
                            <LabelColorSwatch
                              labelId={item.label_id}
                              size={16}
                            />
                            <Text>{item.name!}</Text>
                          </Group>
                          {item.unread_count && (
                            <Badge variant="filled">{item.unread_count}</Badge>
                          )}
                        </Group>
                      ),
                      link: `/mailbox?labels=${item.label_id}`,
                    })) ?? []
                  }
                  initiallyOpened={true}
                />
              )}
              <LinksGroup
                icon={<IconMailbox size={16} />}
                label={<Text>Mailing Lists</Text>}
                link={"/mailing-lists"}
              />
              <LinksGroup
                icon={<IconTag size={16} />}
                label={<Text>Manage Labels</Text>}
                link={"/manage-labels"}
              />
            </>
          )}
        </div>
      </Navbar.Section>

      <Navbar.Section className={classes.footer}>
        {status === "authenticated" && <UserButton />}
        {status === "unauthenticated" && (
          <LoginWithEveOnlineButton
            width={NAVBAR_WIDTH - 2 * theme.spacing.xs}
            onClick={() => signIn("eveonline")}
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
  );
}
