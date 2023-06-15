import { memo } from "react";
import { Anchor, type AnchorProps } from "@mantine/core";

import { EveMailSenderName } from "../Text";

export type EveMailSenderNameAnchorProps = AnchorProps & {
  messageId?: number;
};

export const EveMailSenderNameAnchor = memo(
  ({ messageId, ...props }: EveMailSenderNameAnchorProps) => {
    return (
      <Anchor {...props}>
        <EveMailSenderName messageId={messageId} />
      </Anchor>
    );
  },
);
EveMailSenderNameAnchor.displayName = "EveMailSenderNameAnchor";
