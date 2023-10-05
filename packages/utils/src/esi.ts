import { type GetCharactersCharacterIdMailLabels200LabelsItem } from "@jitaspace/esi-client-kubb";

export const SPECIAL_LABEL_IDS = [1, 2, 4, 8];

export const isSpecialLabelId = (id?: number) =>
  id && SPECIAL_LABEL_IDS.includes(id);

export const humanLabelName = (
  label?: GetCharactersCharacterIdMailLabels200LabelsItem,
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
