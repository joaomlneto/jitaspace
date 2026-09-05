"use client";

import type { UnstyledButtonProps } from "@mantine/core";
import type { ImageProps } from "next/image";
import { memo } from "react";
import Image from "next/image";
import {
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useHover } from "@mantine/hooks";

export type LoginWithEveOnlineButtonProps = UnstyledButtonProps & {
  width?: number;
  size?: "large" | "small";
  onClick?: () => void;
  imageProps?: Omit<ImageProps, "src" | "alt" | "width" | "height">;
};

export const LoginWithEveOnlineButton = memo(
  ({
    imageProps,
    size,
    width: widthProp,
    onClick,
    style,
    className,
    ...otherProps
  }: LoginWithEveOnlineButtonProps) => {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    // Hover is tracked in JS: this package ships raw TSX with no stylesheet of
    // its own, and a React inline `style` object cannot express `:hover`.
    const { hovered, ref } = useHover<HTMLButtonElement>();

    const url = `https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-${
      colorScheme === "dark" ? "black" : "white"
    }-large.png`;

    const defaultWidth = size === "large" ? 270 : 195;
    const defaultHeight = size === "large" ? 45 : 30;

    const width = widthProp ?? defaultWidth;
    const height = (width / defaultWidth) * defaultHeight;

    const hoverBackground =
      colorScheme === "dark" ? theme.colors.dark[8] : theme.colors.gray[0];

    return (
      <UnstyledButton
        ref={ref}
        onClick={onClick}
        {...otherProps}
        // UnstyledButton has no focus ring of its own; this is Mantine's own
        // utility class for one, so keyboard users get the affordance that
        // `hovered` only gives to pointers.
        className={["mantine-focus-auto", className].filter(Boolean).join(" ")}
        // An array style is merged in order by Mantine, so a caller's `style`
        // overrides individual properties instead of replacing the whole
        // object — which would silently drop the hover background again.
        style={[
          {
            display: "block",
            padding: theme.spacing.xs,
            color: colorScheme === "dark" ? theme.colors.dark[0] : theme.black,
            backgroundColor: hovered ? hoverBackground : undefined,
          },
          style,
        ]}
      >
        <Image
          src={url}
          alt="Login with EVE Online"
          width={width}
          height={height}
          {...imageProps}
        />
      </UnstyledButton>
    );
  },
);
LoginWithEveOnlineButton.displayName = "LoginWithEveOnlineButton";
