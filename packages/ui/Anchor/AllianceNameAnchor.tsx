import { memo } from "react";
import Link, { type LinkProps } from "next/link";
import { Anchor, type AnchorProps } from "@mantine/core";

import { AllianceName } from "../Text";

export type AllianceNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref"> & {
    allianceId: string | number;
  };

export const AllianceNameAnchor = memo(
  ({ allianceId, ...props }: AllianceNameAnchorProps) => {
    return (
      <Anchor component={Link} href={`/alliances/${allianceId}`} {...props}>
        <AllianceName span allianceId={allianceId} />
      </Anchor>
    );
  },
);
AllianceNameAnchor.displayName = "AllianceNameAnchor";
