import { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { useGetUniverseStargatesStargateId } from "@jitaspace/esi-client-kubb";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type StargateDestinationNameAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    stargateId: number;
  };
export const StargateDestinationAnchor = memo(
  ({
    stargateId,
    children,
    ...otherProps
  }: StargateDestinationNameAnchorProps) => {
    const { data } = useGetUniverseStargatesStargateId(stargateId);
    return (
      <EveEntityAnchor
        entityId={data?.data.destination.system_id}
        category="solar_system"
        {...otherProps}
      >
        {children}
      </EveEntityAnchor>
    );
  },
);
StargateDestinationAnchor.displayName = "StargateDestinationAnchor";
