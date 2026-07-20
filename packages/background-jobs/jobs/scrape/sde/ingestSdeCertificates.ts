import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  ingestSdeTable,
  loadSdeFiles,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeCertificatesEventPayload {
  data: Record<string, never>;
}

interface CertificateSkillLevels {
  basic: number;
  standard: number;
  improved: number;
  advanced: number;
  elite: number;
}
interface CertificateRecord {
  skillTypes?: Record<string, CertificateSkillLevels>;
  recommendedFor?: number[];
}

/**
 * certificates.yaml feeds three tables: Certificate (the certificate itself),
 * CertificateSkill (the required skill level at each grade) and
 * CertificateRecommendation (the types it is recommended for). Skill/type refs
 * are FK-guarded against types.yaml.
 */
export const ingestSdeCertificates = defineJob<
  IngestSdeCertificatesEventPayload["data"]
>({
  id: "ingest-sde-certificates",
  name: "Ingest SDE Certificates",
  description:
    "Download the SDE and ingest certificates.yaml into the Certificate, CertificateSkill and CertificateRecommendation tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["certificates.yaml", "types.yaml"]);
    const data = files["certificates.yaml"];
    const typeIds = new Set(Object.keys(files["types.yaml"]).map(Number));

    // FK order: Certificate first, then its skill / recommendation children.
    const certificates = await ingestSdeTable({
      filename: "certificates.yaml",
      idField: "certificateId",
      delegate: prisma.certificate,
      records: data,
      toRow: (record, id): Prisma.CertificateCreateManyInput => ({
        certificateId: id,
        name: enString(record.name) ?? "",
        description: enString(record.description) ?? "",
        groupId: requiredNumber(record.groupID),
        isDeleted: false,
      }),
    });

    const skills: Prisma.CertificateSkillCreateManyInput[] = [];
    const recommendations: Prisma.CertificateRecommendationCreateManyInput[] =
      [];
    for (const [key, value] of Object.entries(data)) {
      const certificateId = Number(key);
      const record = value as CertificateRecord;
      for (const [skillKey, levels] of Object.entries(
        record.skillTypes ?? {},
      )) {
        const skillTypeId = Number(skillKey);
        if (!typeIds.has(skillTypeId)) continue;
        skills.push({
          certificateId,
          skillTypeId,
          basic: requiredNumber(levels.basic),
          standard: requiredNumber(levels.standard),
          improved: requiredNumber(levels.improved),
          advanced: requiredNumber(levels.advanced),
          elite: requiredNumber(levels.elite),
          isDeleted: false,
        });
      }
      for (const typeId of record.recommendedFor ?? []) {
        if (!typeIds.has(typeId)) continue;
        recommendations.push({ certificateId, typeId, isDeleted: false });
      }
    }

    const scopeIds = Object.keys(data).map(Number);

    const certificateSkills = await ingestSdeCompositeTable({
      delegate: prisma.certificateSkill,
      rows: skills,
      keyFields: ["certificateId", "skillTypeId"],
      scopeField: "certificateId",
      scopeIds,
    });
    const certificateRecommendations = await ingestSdeCompositeTable({
      delegate: prisma.certificateRecommendation,
      rows: recommendations,
      keyFields: ["certificateId", "typeId"],
      scopeField: "certificateId",
      scopeIds,
    });

    return {
      stats: { certificates, certificateSkills, certificateRecommendations },
      elapsed: performance.now() - start,
    };
  },
});
