import { Anchor, type AnchorProps } from "@mantine/core";

import { AllianceName } from "../Text";

export type AllianceNameAnchorProps = AnchorProps & {
  allianceId: string | number;
};

export function AllianceNameAnchor({
  allianceId,
  ...props
}: AllianceNameAnchorProps) {
  return (
    <Anchor {...props}>
      <AllianceName allianceId={allianceId} />
    </Anchor>
  );
}
