import { Anchor, type AnchorProps } from "@mantine/core";

import { EveMailSenderName } from "../Text";

export type EveMailSenderNameAnchorProps = AnchorProps & {
  messageId?: number;
};

export function EveMailSenderNameAnchor({
  messageId,
  ...props
}: EveMailSenderNameAnchorProps) {
  return (
    <Anchor {...props}>
      <EveMailSenderName messageId={messageId} />
    </Anchor>
  );
}
