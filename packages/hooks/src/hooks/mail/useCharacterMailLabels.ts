import { useMemo } from "react";

import {
  deleteCharactersCharacterIdMailLabelsLabelId,
  useGetCharactersCharacterIdMailLabels,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export function useCharacterMailLabels(characterId: number) {
  const { accessToken, authHeaders, character } = useAccessToken({
    characterId,
    scopes: ["esi-mail.read_mail.v1"],
  });

  const labels = useGetCharactersCharacterIdMailLabels(
    characterId ?? 0,
    {},
    { ...authHeaders },
    {
      query: {
        enabled: accessToken !== null,
      },
    },
  );

  const canDeleteLabel = useMemo(
    () =>
      character?.accessTokenPayload.scp.includes("esi-mail.organize_mail.v1") ??
      false,
    [character?.accessTokenPayload],
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

    await deleteCharactersCharacterIdMailLabelsLabelId(
      characterId!,
      labelId,
      {},
      {
        headers: {
          ...authHeaders,
        },
      },
    );

    // TODO mutate the labels state in React Query

    return { success: true };
  };

  return { ...labels, deleteLabel };
}
