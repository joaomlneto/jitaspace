import React, { memo } from "react";
import Image, { type ImageProps } from "next/image";
import {
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
  type UnstyledButtonProps,
} from "@mantine/core";

export type LoginWithEveOnlineButtonProps = UnstyledButtonProps & {
  width?: number;
  size?: "large" | "small";
  onClick?: () => void;
  imageProps?: Omit<ImageProps, "src" | "alt" | "width" | "height">;
};

export const LoginWithEveOnlineButton = memo(
  ({ imageProps, size, ...otherProps }: LoginWithEveOnlineButtonProps) => {
    const theme = useMantineTheme();
    const { colorScheme } = useMantineColorScheme();
    const classes = {
      user: {
        display: "block",
        padding: theme.spacing.xs,
        color: colorScheme === "dark" ? theme.colors.dark[0] : theme.black,

        "&:hover": {
          backgroundColor:
            colorScheme === "dark"
              ? theme.colors.dark[8]
              : theme.colors.gray[0],
        },
      },
    };

    const url = `https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-${
      colorScheme === "dark" ? "black" : "white"
    }-large.png`;

    const defaultWidth = size === "large" ? 270 : 195;
    const defaultHeight = size === "large" ? 45 : 30;

    const width = otherProps.width ?? defaultWidth;
    const height = (width / defaultWidth) * defaultHeight;

    return (
      <UnstyledButton
        onClick={otherProps.onClick}
        style={classes.user}
        {...otherProps}
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
