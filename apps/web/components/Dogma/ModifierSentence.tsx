"use client";

import type { ReactNode } from "react";
import { Fragment } from "react";
import { Code, Text, Tooltip } from "@mantine/core";

import { TypeAnchor } from "@jitaspace/eve-components";
import {
  DogmaAttributeAnchor,
  DogmaEffectAnchor,
  GroupAnchor,
} from "@jitaspace/ui";

import type { DogmaModifier, DogmaModifierLine } from "~/lib/dogmaModifiers";
import {
  DOGMA_DOMAIN_HINTS,
  dogmaDomainNoun,
  dogmaOperatorInfo,
} from "~/lib/dogmaModifiers";

/**
 * A dogma modifier in plain language — "Energy Weapon on the ship › Turret
 * Tracking + Tracking Speed Bonus %" — with every attribute, group, skill and
 * effect linked. Shared by the dogma effect and dogma attribute pages.
 */

export interface EffectAttribute {
  attributeId: number;
  name: string | null;
  displayName: string | null;
  unitId: number | null;
  unitSymbol: string | null;
}

export interface EffectModifier extends DogmaModifier {
  groupName: string | null;
  skillName: string | null;
  targetEffectName: string | null;
}

/** "A", "A and B", "A, B and C", keyed by each item's id. */
function joinNodes(
  ids: number[],
  render: (id: number) => ReactNode,
): ReactNode {
  return ids.map((id, index) => (
    <Fragment key={id}>
      {index > 0 && (index === ids.length - 1 ? " and " : ", ")}
      {render(id)}
    </Fragment>
  ));
}

export function attributeLabel(
  attributeId: number,
  attribute: EffectAttribute | undefined,
): string {
  return (
    attribute?.displayName ?? attribute?.name ?? `Attribute ${attributeId}`
  );
}

export function AttributeLink({
  attributeId,
  attributes,
}: Readonly<{
  attributeId: number;
  attributes: Map<number, EffectAttribute>;
}>) {
  const attribute = attributes.get(attributeId);
  return (
    <DogmaAttributeAnchor
      attributeId={attributeId}
      title={attribute?.name ?? undefined}
    >
      {attributeLabel(attributeId, attribute)}
    </DogmaAttributeAnchor>
  );
}

export function DomainNoun({ domain }: Readonly<{ domain: string | null }>) {
  const noun = dogmaDomainNoun(domain);
  const hint = domain === null ? undefined : DOGMA_DOMAIN_HINTS[domain];
  if (!hint) return <>{noun}</>;
  return (
    <Tooltip label={hint} withArrow multiline maw={280}>
      <Text
        component="span"
        inherit
        style={{ textDecoration: "underline dotted", cursor: "help" }}
      >
        {noun}
      </Text>
    </Tooltip>
  );
}

/** Who a line applies to: "Energy Weapon on the ship", "The character"… */
function LineSubject({
  line,
  modifiers,
}: Readonly<{ line: DogmaModifierLine; modifiers: EffectModifier[] }>) {
  const domain = <DomainNoun domain={line.domain} />;
  const first = modifiers[0];
  const skill =
    line.skillTypeId === null ? null : (
      <TypeAnchor typeId={line.skillTypeId}>
        {first?.skillName ?? `Type ${line.skillTypeId}`}
      </TypeAnchor>
    );
  const groups = joinNodes(line.groupIds, (groupId) => (
    <GroupAnchor groupId={groupId}>
      {modifiers.find((modifier) => modifier.groupId === groupId)?.groupName ??
        `Group ${groupId}`}
    </GroupAnchor>
  ));

  switch (line.func) {
    case "ItemModifier":
      return <>The {domain}</>;
    case "LocationModifier":
      return <>Everything on the {domain}</>;
    case "LocationGroupModifier":
      return (
        <>
          {groups} on the {domain}
        </>
      );
    case "LocationRequiredSkillModifier":
      return (
        <>
          Items requiring {skill} on the {domain}
        </>
      );
    case "OwnerRequiredSkillModifier":
      return (
        <>
          Items owned by the {domain} requiring {skill}
        </>
      );
    default:
      return (
        <>
          <Code>{line.func}</Code> on the {domain}
        </>
      );
  }
}

export function ModifierSentence({
  line,
  modifiers,
  attributes,
}: Readonly<{
  line: DogmaModifierLine;
  modifiers: EffectModifier[];
  attributes: Map<number, EffectAttribute>;
}>) {
  if (line.func === "EffectStopper") {
    return (
      <Text>
        <Text component="span" fw={700}>
          Stops
        </Text>{" "}
        {joinNodes(line.targetEffectIds, (effectId) => (
          <DogmaEffectAnchor effectId={effectId}>
            {modifiers.find((modifier) => modifier.targetEffectId === effectId)
              ?.targetEffectName ?? `Effect ${effectId}`}
          </DogmaEffectAnchor>
        ))}{" "}
        on the <DomainNoun domain={line.domain} />
      </Text>
    );
  }

  const operator = dogmaOperatorInfo(line.operator);
  const modified = joinNodes(line.modifiedAttributeIds, (attributeId) => (
    <AttributeLink attributeId={attributeId} attributes={attributes} />
  ));

  return (
    <Text>
      <Text component="span" fw={700}>
        <LineSubject line={line} modifiers={modifiers} />
      </Text>
      <Text component="span" c="dimmed" mx={6}>
        ›
      </Text>
      {modified}{" "}
      <Text component="span" fw={700} ff="monospace">
        {operator ? operator.symbol : `op ${line.operator ?? "?"}`}
      </Text>{" "}
      {line.modifyingAttributeId === null ? (
        <Text component="span" c="dimmed">
          (no modifying attribute)
        </Text>
      ) : (
        <AttributeLink
          attributeId={line.modifyingAttributeId}
          attributes={attributes}
        />
      )}
      {operator?.suffix && (
        <Text component="span" fw={700} ff="monospace">
          {" "}
          {operator.suffix}
        </Text>
      )}
    </Text>
  );
}
