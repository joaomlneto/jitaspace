import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFile,
  plainString,
  requiredBoolean,
  subRecord,
} from "../../../helpers";

export interface IngestSdeCorporationRoleGroupsEventPayload {
  data: Record<string, never>;
}

export interface IngestSdeCorporationRolesEventPayload {
  data: Record<string, never>;
}

/**
 * corporationRoleGroups.yaml — the tabs corporation roles are grouped under.
 * `appliesTo` / `appliesToGrantable` name the ESI member-roles fields the
 * group's roles are read from (`roles`, `grantableRoles`, …).
 */
export const ingestSdeCorporationRoleGroups = defineJob<
  IngestSdeCorporationRoleGroupsEventPayload["data"]
>({
  id: "ingest-sde-corporation-role-groups",
  name: "Ingest SDE Corporation Role Groups",
  description:
    "Download the SDE and ingest corporationRoleGroups.yaml into the CorporationRoleGroup table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const corporationRoleGroups = await ingestSdeTable({
      filename: "corporationRoleGroups.yaml",
      idField: "corporationRoleGroupId",
      delegate: prisma.corporationRoleGroup,
      toRow: (record, id): Prisma.CorporationRoleGroupCreateManyInput => ({
        corporationRoleGroupId: id,
        name: enString(record.name) ?? "",
        appliesTo: plainString(record.appliesTo) ?? "",
        appliesToGrantable: plainString(record.appliesToGrantable) ?? "",
        isDivisional: requiredBoolean(record.isDivisional),
        isLocational: requiredBoolean(record.isLocational),
        isDeleted: false,
      }),
    });
    return {
      stats: { corporationRoleGroups },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * corporationRoles.yaml — the roles themselves plus their membership of the role
 * groups above. One role belongs to several groups, so the membership is a join
 * table rather than a column.
 */
export const ingestSdeCorporationRoles = defineJob<
  IngestSdeCorporationRolesEventPayload["data"]
>({
  id: "ingest-sde-corporation-roles",
  name: "Ingest SDE Corporation Roles",
  description:
    "Download the SDE and ingest corporationRoles.yaml into the CorporationRole and CorporationRoleGroupMember tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const data = await loadSdeFile("corporationRoles.yaml");

    const corporationRoles = await ingestSdeTable({
      filename: "corporationRoles.yaml",
      idField: "corporationRoleId",
      delegate: prisma.corporationRole,
      records: data,
      toRow: (record, id): Prisma.CorporationRoleCreateManyInput => ({
        corporationRoleId: id,
        shortName: plainString(record.shortName) ?? "",
        name: enString(record.name) ?? "",
        description: enString(record.description) ?? "",
        isDeleted: false,
      }),
    });

    const members: Prisma.CorporationRoleGroupMemberCreateManyInput[] = [];
    for (const [key, value] of Object.entries(data)) {
      const corporationRoleId = Number(key);
      const groupIds = subRecord(value).roleGroupIDs;
      for (const groupId of Array.isArray(groupIds) ? groupIds : []) {
        members.push({
          corporationRoleId,
          corporationRoleGroupId: Number(groupId),
          isDeleted: false,
        });
      }
    }

    const corporationRoleGroupMembers = await ingestSdeCompositeTable({
      delegate: prisma.corporationRoleGroupMember,
      rows: members,
      keyFields: ["corporationRoleId", "corporationRoleGroupId"],
      scopeField: "corporationRoleId",
      scopeIds: Object.keys(data).map(Number),
    });

    return {
      stats: { corporationRoles, corporationRoleGroupMembers },
      elapsed: performance.now() - start,
    };
  },
});
