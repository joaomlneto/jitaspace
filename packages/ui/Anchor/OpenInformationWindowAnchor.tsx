"use client";

import { memo } from "react";
import { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";
import { showNotification } from "@mantine/notifications";

import { postUiOpenwindowInformation } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";





export type OpenInformationWindowAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    characterId: number;
    entityId?: string | number;
  };

export const OpenInformationWindowAnchor = memo(
  ({
    characterId,
    entityId,
    children,
    ...props
  }: OpenInformationWindowAnchorProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-ui.open_window.v1"],
    });

    const canOpenWindow = !!entityId && accessToken !== null;

    return (
      <Anchor
        {...props}
        onClick={() => {
          if (!canOpenWindow) {
            showNotification({ message: "Insufficient permissions" });
            console.log({ canOpenWindow });
          } else {
            void postUiOpenwindowInformation(
              {
                target_id:
                  typeof entityId === "string" ? parseInt(entityId) : entityId,
              },
              { headers: { ...authHeaders } },
            ).then(() => {
              showNotification({
                message: "Information window opened in EVE client.",
              });
            });
          }
        }}
      >
        {children}
      </Anchor>
    );
  },
);
OpenInformationWindowAnchor.displayName = "OpenInformationWindowAnchor";
