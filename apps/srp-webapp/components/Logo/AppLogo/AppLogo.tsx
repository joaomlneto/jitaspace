import { useMantineTheme } from "@mantine/core";
import Image, { ImageProps } from "next/image";
import React from "react";
import LogoBlack from "./logo-black.png";
import LogoWhite from "./logo-white.png";

type Props = Omit<ImageProps, "src" | "alt"> & {
  alt?: ImageProps["alt"];
  variant?: "white" | "black";
};

export function AppLogo({ alt, variant, ...otherProps }: Props) {
  const theme = useMantineTheme();

  return (
    <Image
      src={
        variant
          ? variant === "white"
            ? LogoWhite
            : LogoBlack
          : theme.colorScheme === "light"
          ? LogoBlack
          : LogoWhite
      }
      alt={alt ?? "Logo"}
      {...otherProps}
    />
  );
}
