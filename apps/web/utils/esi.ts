import { GetCharactersCharacterIdMailLabels200LabelsItem } from "../esi/model";

export const characterIdRanges: [number, number][] = [
  [3000000, 4000000],
  [90000000, 98000000],
  [2100000000, 2147483647],
];

export const corporationIdRanges: [number, number][] = [
  [1000000, 2000000],
  [98000000, 99000000],
];

export const allianceIdRanges: [number, number][] = [[99000000, 100000000]];

export const isIdInRanges = (id: number, ranges: [number, number][]) =>
  ranges.some(([min, max]) => id >= min && id <= max);

export const SPECIAL_LABEL_IDS = [1, 2, 4, 8];

export const isSpecialLabelId = (id?: number) =>
  id && SPECIAL_LABEL_IDS.includes(id);

export const humanLabelName = (
  label?: GetCharactersCharacterIdMailLabels200LabelsItem
): string => {
  switch (label?.label_id) {
    case 1:
      return "Inbox";
    case 2:
      return "Sent";
    case 4:
      return "Corporation";
    case 8:
      return "Alliance";
    default:
      return label?.name ?? label?.label_id?.toString() ?? "Unknown Label";
  }
};
