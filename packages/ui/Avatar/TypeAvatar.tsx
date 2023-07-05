import { memo } from "react";
import { type AvatarProps } from "@mantine/core";
import useSWRImmutable from "swr/immutable";

import { UnknownIcon } from "@jitaspace/eve-icons";

import { EveImageServerAvatar } from "./EveImageServerAvatar";

export type TypeAvatarProps = Omit<AvatarProps, "src"> & {
  typeId?: string | number;
  variation?: string;
};

export const TypeAvatar = memo(
  ({ typeId, variation, ...otherProps }: TypeAvatarProps) => {
    // FIXME: THIS MESSES UP SEPARATION OF CONCERNS! ARGH CCP WHY U NO CORS
    const { data } = useSWRImmutable<string[]>(
      typeId && !variation
        ? `/api/esi/image-variants?category=types&id=${typeId}`
        : null,
      (input: RequestInfo | URL, init?: RequestInit | undefined) =>
        fetch(input, init).then((res) => res.json()),
    );
    return (
      <EveImageServerAvatar
        category="types"
        id={typeId}
        variation={variation ?? data?.[0] ?? "icon"}
        size={otherProps.size}
        {...otherProps}
      >
        {/* FIXME: size should depend on props */}
        <UnknownIcon width={32} />
      </EveImageServerAvatar>
    );
  },
);
TypeAvatar.displayName = "TypeAvatar";
