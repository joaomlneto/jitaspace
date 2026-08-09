// Every icon module imports its artwork directly (`import RheaImage from
// "./rhea.png"`), which needs Next's static-image module declarations. Apps get
// them from the generated `next-env.d.ts`, but packages do not — and because
// this package ships TypeScript source, consumers compile these files in *their*
// program too. Referencing the types from the module every icon imports lets the
// declarations travel with the import graph, so any consumer is covered without
// keeping its own copy in sync.
/// <reference types="next/image-types/global" />
import { memo } from "react";
import Image, { type ImageProps, type StaticImageData } from "next/image";

import { DEFAULT_ICON_VERSION, type IconVersion } from "../context";

export type EveIconProps = Omit<Partial<ImageProps>, "src"> & {
  variant?: IconVersion;
};

export const createEveIconComponent = ({
  name,
  variants,
}: {
  name: string;
  variants: {
    [key in "castor" | "incarna" | "rhea"]: string | StaticImageData;
  };
}) => {
  const Component = memo(({ alt, variant, ...props }: EveIconProps) => {
    return (
      <Image
        src={variants[variant ?? DEFAULT_ICON_VERSION]}
        alt={alt ?? name}
        {...props}
      />
    );
  });
  Component.displayName = name;
  return Component;
};
