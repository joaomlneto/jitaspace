import React, { type ReactElement } from "react";
import { type GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Button,
  Container,
  Group,
  JsonInput,
  List,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { NextSeo } from "next-seo";

import { useGetUniverseTypesTypeId } from "@jitaspace/esi-client";
import {
  DogmaAttributeName,
  DogmaEffectName,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { MailLayout } from "~/layouts";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const typeId = context.params?.typeId as string;
  const typeImageVariations: string[] = typeId
    ? ((await fetch(`https://images.evetech.net/types/${typeId}`).then((res) =>
        res.json(),
      )) as string[])
    : [];
  const ogVariation =
    !typeImageVariations || typeImageVariations?.includes("render")
      ? "render"
      : typeImageVariations[0]!;
  context.res.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=3600",
  );
  return {
    props: {
      typeImageVariations,
      ogImageUrl: `https://images.evetech.net/types/${typeId}/${ogVariation}`,
    },
  };
};

export default function Page({
  typeImageVariations,
  ogImageUrl,
}: {
  typeImageVariations: string[];
  ogImageUrl: string;
}) {
  const router = useRouter();
  const typeId = router.query.typeId as string;
  const { data: type } = useGetUniverseTypesTypeId(parseInt(typeId));

  const sanitizeDescription = (str: string): string => {
    // FIXME: IS THIS CORRECT? THIS WILL CONSIDER THAT THE WHOLE EMAIL IS A "UNICODE BLOCK".
    //        THIS MIGHT BREAK BADLY IF MULTIPLE BLOCKS ARE ALLOWED TO EXIST WITHIN THE STRING!
    if (str.startsWith("u'") && str.endsWith("'")) {
      str = str.slice(2, -1);
      str = str.replaceAll(/\\x[0-9a-fA-F]{2}/g, (str) => {
        const charCode = parseInt(str.slice(2), 16);
        return String.fromCharCode(charCode);
      });
      str = str.replaceAll(/\\'/g, "'");
    }
    return str;
  };

  console.log("TYPE OG IMAGE:", ogImageUrl);

  return (
    <>
      <NextSeo
        openGraph={{
          type: "article",
          images: [
            {
              type: "image/png",
              alt: type?.data.name ?? `Type ${typeId}`,
              width: 512,
              height: 512,
              url: ogImageUrl,
              secureUrl: ogImageUrl,
            },
          ],
          siteName: "Jita",
        }}
        twitter={{
          cardType: "summary",
          site: "https://www.jita.space",
        }}
        themeColor="#9bb4d0"
      />
      <Container size="sm">
        <Stack>
          <JsonInput
            label="RAW DATA"
            value={JSON.stringify({ typeImageVariations, ogImageUrl }, null, 2)}
            autosize
            readOnly
            maxRows={50}
          />
          <Group spacing="xl">
            <TypeAvatar typeId={typeId} size="xl" radius={256} />
            <Title order={3}>
              <TypeName span typeId={typeId} />
            </Title>
          </Group>
          <Group>
            <Link
              href={`https://www.everef.net/type/${typeId}`}
              target="_blank"
            >
              <Button>
                <Group spacing="xs">
                  <IconExternalLink size={14} />
                  Eve Ref
                </Group>
              </Button>
            </Link>
          </Group>
          {type?.data.description && (
            <MailMessageViewer
              content={
                type.data.description
                  ? sanitizeDescription(type.data.description)
                  : "No description"
              }
            />
          )}
          {type?.data.dogma_attributes && (
            <Group position="apart" align="start">
              <Text>Attributes</Text>
              <List>
                {type?.data.dogma_attributes?.map((attr) => (
                  <List.Item key={attr.attribute_id}>
                    <Group position="apart">
                      <DogmaAttributeName attributeId={attr.attribute_id} />
                      <Text>{attr.value}</Text>
                    </Group>
                  </List.Item>
                ))}
              </List>
            </Group>
          )}
          {type?.data.dogma_effects && (
            <Group position="apart" align="start">
              <Text>Effects</Text>
              <List>
                {type?.data.dogma_effects?.map((effect) => (
                  <List.Item key={effect.effect_id}>
                    <Group position="apart">
                      <DogmaEffectName effectId={effect.effect_id} />
                    </Group>
                  </List.Item>
                ))}
              </List>
            </Group>
          )}
        </Stack>
      </Container>
    </>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
