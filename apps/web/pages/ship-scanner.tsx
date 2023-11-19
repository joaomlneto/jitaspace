import React, { ReactElement, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Container,
  FocusTrap,
  HoverCard,
  SimpleGrid,
  Stack,
  Textarea,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import { NextSeo } from "next-seo";

import { useType } from "@jitaspace/hooks";
import { EveEntitySelect } from "@jitaspace/ui";

import { ShipFittingCard } from "~/components/Fitting";
import { MainLayout } from "~/layouts";

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

export default function Page() {
  const [ship, setShip] = useState<string | null>(null);
  const [scans, setScans] = useState<ScanResult[]>([]);
  const { data: shipData } = useType(ship);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const mergedScans = mergeScans(scans);

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
    <Container size="sm">
      <Stack>
        <Title>Ship Scanning Helper</Title>
        <SimpleGrid cols={2} breakpoints={[{ maxWidth: "xs", cols: 1 }]}>
          <Stack>
            <FocusTrap active={true}>
              <EveEntitySelect
                autoFocus
                label="Select a ship"
                placeholder={"Which ship are you scanning?"}
                entityIds={[{ id: 641 }, { id: 642 }, { id: 649 }]}
                onChange={(value) => {
                  inputRef.current?.focus();
                  setShip(value);
                }}
                value={ship}
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
                <SimpleGrid
                  cols={2}
                  breakpoints={[
                    { maxWidth: "lg", cols: 2 },
                    { maxWidth: "xs", cols: 1 },
                  ]}
                >
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
                        {false && (
                          <ShipFittingCard
                            shipTypeId={Number(ship)}
                            fit={{
                              shipName: `Scanned ${shipData?.name ?? "Ship"}`,
                              typeName: shipData?.name ?? "",
                              ...scan,
                              subsystemSlots: [],
                              cargoHold: [],
                              droneBay: [],
                            }}
                          />
                        )}
                      </HoverCard.Dropdown>
                    </HoverCard>
                  ))}
                </SimpleGrid>
                <Button
                  disabled={!ship || scans.length === 0}
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
            {false && (
              <ShipFittingCard
                shipTypeId={ship ? Number(ship) : undefined}
                fit={{
                  shipName: `Scanned ${shipData?.data.name ?? "Ship"}`,
                  typeName: shipData?.data.name ?? "Unknown Ship Type",
                  ...mergedScans,
                  subsystemSlots: [],
                  cargoHold: [],
                  droneBay: [],
                  //charges: scans.flatMap(scan => scan.charges),
                }}
                showEmptySections
                showEmptySlots
                showExcessModules
              />
            )}
          </Stack>
        </SimpleGrid>
      </Stack>
      {false && (
        <JsonInput
          label="Scans"
          value={JSON.stringify(scans, null, 2)}
          readOnly
          autosize
          maxRows={10}
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
