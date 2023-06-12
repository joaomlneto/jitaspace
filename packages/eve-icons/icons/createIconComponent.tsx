import { memo } from "react";
import Image, { type ImageProps, type StaticImageData } from "next/image";

import { useEveIconsConfig, type IconVersion } from "../context";

type EveIconProps = Omit<ImageProps, "src"> & {
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
    const { iconVersion } = useEveIconsConfig();
    return (
      <Image
        src={variants[variant ?? iconVersion]}
        alt={alt ?? name}
        {...props}
      />
    );
  });
  Component.displayName = name;
  return Component;
};
