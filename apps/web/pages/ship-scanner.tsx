import React, { ReactElement, useMemo, useState } from "react";
import { GetStaticProps } from "next";
import {
  ActionIcon,
  Badge,
  Button,
  Container,
  FocusTrap,
  Group,
  HoverCard,
  JsonInput,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { getCharactersCharacterIdFittingsQueryResponseItemsFlag } from "@jitaspace/esi-client";
import {
  FittingItemFlag,
  useEsiTypeIdsFromNames,
  useType,
} from "@jitaspace/hooks";
import { EveEntitySelect, TypeAnchor, TypeAvatar } from "@jitaspace/ui";

import { ShipFittingCard } from "~/components/Fitting";
import { MainLayout } from "~/layouts";

type PageProps = {
  ships: {
    id: number;
    name: string;
  }[];
};

const SHIP_CATEGORY_ID = 6;

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const shipGroups = await prisma.category.findUniqueOrThrow({
      select: {
        groups: {
          select: {
            groupId: true,
            name: true,
          },
        },
      },
      where: {
        categoryId: SHIP_CATEGORY_ID,
      },
    });

    const shipGroupIds = shipGroups.groups.map((group) => group.groupId);

    const shipTypes = await prisma.type.findMany({
      select: {
        typeId: true,
        name: true,
      },
      where: {
        groupId: {
          in: shipGroupIds,
        },
        published: true,
      },
      orderBy: [{ name: "asc" }],
    });

    return {
      props: {
        ships: shipTypes.map((type) => ({ id: type.typeId, name: type.name })),
      },
      revalidate: 24 * 3600,
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 3600, // every hour
    };
  }
};

const SCAN_CATEGORIES = [
  "High Power Slots",
  "Medium Power Slots",
  "Low Power Slots",
  "Rig Slots",
  "Sub System Slots",
  "Charges",
];

type ScanModule = {
  name: string;
  quantity: number;
};

interface ScanResult {
  highSlots: ScanModule[];
  midSlots: ScanModule[];
  lowSlots: ScanModule[];
  rigSlots: ScanModule[];
  charges: ScanModule[];
}

const CATEGORY_KEY: Record<string, keyof ScanResult> = {
  "High Power Slots": "highSlots",
  "Medium Power Slots": "midSlots",
  "Low Power Slots": "lowSlots",
  "Rig Slots": "rigSlots",
  Charges: "charges",
};

function parseScan(scan: string) {
  const lines = scan.split("\n");
  let currentCategory: keyof ScanResult | null = null;
  const result: ScanResult = {
    highSlots: [],
    midSlots: [],
    lowSlots: [],
    rigSlots: [],
    charges: [],
  };
  for (const line of lines) {
    if (SCAN_CATEGORIES.some((category) => line.includes(category))) {
      console.log("Switch to category:", line, CATEGORY_KEY[line]);
      currentCategory = CATEGORY_KEY[line] ?? null;
    } else {
      if (currentCategory === null) throw new Error("Invalid Scan");
      console.log("Found item:", line, currentCategory);
      if (result[currentCategory].some((item) => item.name === line)) {
        result[currentCategory].find((item) => item.name === line)!.quantity++;
      } else {
        result[currentCategory].push({ name: line, quantity: 1 });
      }
    }
  }
  console.log("result:", result);
  return result;
}

function mergeScans(scans: ScanResult[]) {
  const result: ScanResult = {
    highSlots: [],
    midSlots: [],
    lowSlots: [],
    rigSlots: [],
    charges: [],
  };
  for (const scan of scans) {
    for (const [key, modules] of Object.entries(scan)) {
      const category = key as keyof ScanResult;
      for (const shipModule of modules) {
        // check if module already exists. if so, set quantity to the max of both quantities. otherwise, push the module.
        if (result[category].some((item) => item.name === shipModule.name)) {
          result[category].find(
            (item) => item.name === shipModule.name,
          )!.quantity = Math.max(
            result[category].find((item) => item.name === shipModule.name)!
              .quantity,
            shipModule.quantity,
          );
        } else {
          result[category].push(shipModule);
        }
      }
    }
  }
  return result;
}

function convertScan(scan: ScanResult) {
  const items: {
    flag: FittingItemFlag;
    name: string;
    quantity?: number;
  }[] = [];
  scan.highSlots.forEach((item, index) => {
    const flag = `HiSlot${index}`;
    if (flag in getCharactersCharacterIdFittingsQueryResponseItemsFlag)
      items.push({
        name: item.name,
        quantity: item.quantity,
        // @ts-ignore this is guaranteed to exist
        flag,
      });
  });
  scan.midSlots.forEach((item, index) => {
    const flag = `MedSlot${index}`;
    if (flag in getCharactersCharacterIdFittingsQueryResponseItemsFlag)
      items.push({
        name: item.name,
        quantity: item.quantity,
        // @ts-ignore this is guaranteed to exist
        flag,
      });
  });
  scan.lowSlots.forEach((item, index) => {
    const flag = `LoSlot${index}`;
    if (flag in getCharactersCharacterIdFittingsQueryResponseItemsFlag)
      items.push({
        name: item.name,
        quantity: item.quantity,
        // @ts-ignore this is guaranteed to exist
        flag,
      });
  });
  scan.rigSlots.forEach((item, index) => {
    const flag = `RigSlot${index}`;
    if (flag in getCharactersCharacterIdFittingsQueryResponseItemsFlag)
      items.push({
        name: item.name,
        quantity: item.quantity,
        // @ts-ignore this is guaranteed to exist
        flag,
      });
  });
  scan.charges.forEach((item, index) => {
    const flag = `RigSlot${index}`;
    if (flag in getCharactersCharacterIdFittingsQueryResponseItemsFlag)
      items.push({
        name: item.name,
        quantity: item.quantity,
        // @ts-ignore this is guaranteed to exist
        flag,
      });
  });
  return items;
}

function mergeAndConvertScans(scans: ScanResult[]) {
  const mergedScans = mergeScans(scans);
  return convertScan(mergedScans);
}

export default function Page({ ships }: PageProps) {
  const [shipTypeId, setShipTypeId] = useState<number | undefined>();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const { data: shipData } = useType(
    shipTypeId ?? 0,
    {},
    {},
    { query: { enabled: shipTypeId !== undefined } },
  );
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const mergedScans = useMemo(() => mergeScans(scans), [scans]);
  const scanItems = useMemo(() => mergeAndConvertScans(scans), [scans]);

  const xx = useEsiTypeIdsFromNames(scanItems.map((item) => item.name));

  const handlePaste: React.ClipboardEventHandler = (event) => {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData("text");
    try {
      const parsedScan = parseScan(pastedText.trim());
      setScans((prev) => [...prev, parsedScan]);
    } catch (e) {
      showNotification({
        title: "Invalid Scan",
        message: "The scan you pasted was invalid.",
      });
    }
  };
  return (
    <Container size="sm" onPaste={handlePaste}>
      <Stack>
        <Group>
          <TypeAvatar typeId={443} size={48} />
          <Title>Ship Scanning Helper</Title>
        </Group>
        <Text c="dimmed">
          This tool helps you combine the results of multiple results from a{" "}
          <TypeAnchor typeId={443} target="_blank">
            Ship Scanner
          </TypeAnchor>{" "}
          into a ship fitting.
        </Text>
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <Stack>
            <FocusTrap active={true}>
              <EveEntitySelect
                autoFocus
                label="Select a ship"
                searchable
                placeholder={"Which ship are you scanning?"}
                entityIds={ships}
                onChange={(value) => {
                  inputRef.current?.focus();
                  setShipTypeId(value ? Number(value) : 670);
                }}
                value={shipTypeId?.toString()}
              />
            </FocusTrap>
            <Textarea
              label="Scan Results"
              placeholder="Place your ship scan results here!"
              minRows={5}
              maxRows={5}
              readOnly
            />
            {scans.length > 0 && (
              <>
                <SimpleGrid cols={{ base: 1, xs: 2 }}>
                  {scans.map((scan, index) => (
                    <HoverCard
                      key={`scan-${index}`}
                      width={320}
                      position="bottom"
                      withArrow
                      shadow="md"
                      openDelay={200}
                    >
                      <HoverCard.Target>
                        <UnstyledButton>
                          <Badge
                            fullWidth
                            variant="outline"
                            pr={3}
                            rightSection={
                              <ActionIcon
                                size="xs"
                                radius="xl"
                                color="blue"
                                variant="transparent"
                                onClick={() => {
                                  setScans((prev) => {
                                    const newScans = [...prev];
                                    newScans.splice(index, 1);
                                    return newScans;
                                  });
                                }}
                              >
                                <IconX size={10} />
                              </ActionIcon>
                            }
                          >
                            Scan {index + 1}
                          </Badge>
                        </UnstyledButton>
                      </HoverCard.Target>
                      <HoverCard.Dropdown m={0} p={0}>
                        <ShipFittingCard
                          shipTypeId={shipTypeId ? Number(shipTypeId) : 670}
                          items={convertScan(scan).map((item) => ({
                            ...item,
                            typeId: xx.data?.find(
                              (type) => type.name == item.name,
                            )?.id!,
                          }))}
                        />
                      </HoverCard.Dropdown>
                    </HoverCard>
                  ))}
                </SimpleGrid>
                <Button
                  disabled={!shipTypeId || scans.length === 0}
                  variant="outline"
                  color="red"
                  onClick={() => {
                    openConfirmModal({
                      title: "Clear Scans",
                      children: "Are you sure you want to clear all scans?",
                      labels: {
                        confirm: "Clear Scans",
                        cancel: "Cancel",
                      },
                      onConfirm() {
                        setScans([]);
                      },
                    });
                  }}
                >
                  Clear Scans
                </Button>
              </>
            )}
          </Stack>
          <Stack>
            <ShipFittingCard
              shipTypeId={shipTypeId ? Number(shipTypeId) : 670}
              //showEmptySections
              //showEmptySlots
              //showExcessModules
              items={scanItems.map((item) => ({
                ...item,
                typeId: xx.data?.find((type) => type.name == item.name)?.id!,
              }))}
            />
          </Stack>
        </SimpleGrid>
      </Stack>
      {false && (
        <JsonInput
          label="IDs from Names"
          value={JSON.stringify(xx, null, 2)}
          readOnly
          autosize
          maxRows={40}
        />
      )}
      {false && (
        <JsonInput
          label="Scans"
          value={JSON.stringify(scans, null, 2)}
          readOnly
          autosize
          maxRows={40}
        />
      )}
      {false && (
        <JsonInput
          label="Selected Ship Data"
          value={JSON.stringify(shipData, null, 2)}
          readOnly
          autosize
          maxRows={10}
        />
      )}
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Ship Scanner" />
      {page}
    </MainLayout>
  );
};
