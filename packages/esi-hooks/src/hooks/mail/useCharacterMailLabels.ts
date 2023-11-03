import { useMemo } from "react";

import {
  deleteCharactersCharacterIdMailLabelsLabelId,
  useGetCharactersCharacterIdMailLabels,
} from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";

export function useCharacterMailLabels() {
  const { characterId, isTokenValid, accessToken, scopes } =
    useEsiClientContext();

  const labels = useGetCharactersCharacterIdMailLabels(
    characterId ?? 0,
    { token: accessToken },
    {},
    {
      query: {
        enabled: isTokenValid && scopes.includes("esi-mail.read_mail.v1"),
      },
    },
  );

  const canDeleteLabel = useMemo(
    () => isTokenValid && scopes.includes("esi-mail.organize_mail.v1"),
    [isTokenValid, scopes],
  );

  const deleteLabel = async (
    labelId: number,
  ): Promise<{ success: false; error: string } | { success: true }> => {
    // Check if it has permission to delete label
    if (!canDeleteLabel) {
      return { success: false, error: "Insufficient Permissions" };
    }

    // Retrieve information about the label
    const label = labels.data?.data.labels?.find(
      (label) => label.label_id === labelId,
    );

    // Check if label exists
    if (!label) {
      return { success: false, error: "Label does not exist" };
    }

    await deleteCharactersCharacterIdMailLabelsLabelId(characterId!, labelId, {
      token: accessToken,
    });

    // TODO mutate the labels state in React Query

    return { success: true };
  };

  return { ...labels, deleteLabel };
}
