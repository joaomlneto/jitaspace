import { memo } from "react";
import { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";
import { showNotification } from "@mantine/notifications";

import { postUiOpenwindowInformation } from "@jitaspace/esi-client-kubb";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

export type OpenInformationWindowAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    entityId?: string | number;
  };

export const OpenInformationWindowAnchor = memo(
  ({ entityId, children, ...props }: OpenInformationWindowAnchorProps) => {
    const { isTokenValid, scopes } = useEsiClientContext();
    const canOpenWindow =
      !!entityId && isTokenValid && scopes.includes("esi-ui.open_window.v1");
    return (
      <Anchor
        {...props}
        onClick={() => {
          if (!canOpenWindow) {
            showNotification({ message: "Insufficient permissions" });
            console.log({ canOpenWindow, scopes, isTokenValid });
          } else {
            void postUiOpenwindowInformation({
              target_id:
                typeof entityId === "string" ? parseInt(entityId) : entityId,
            }).then(() => {
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
