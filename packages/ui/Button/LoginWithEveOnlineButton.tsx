import React, { memo } from "react";
import Image, { type ImageProps } from "next/image";
import {
  createStyles,
  UnstyledButton,
  useMantineTheme,
  type UnstyledButtonProps,
} from "@mantine/core";

const useStyles = createStyles((theme) => ({
  user: {
    display: "block",
    padding: theme.spacing.xs,
    color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.black,

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[8]
          : theme.colors.gray[0],
    },
  },
}));

export type LoginWithEveOnlineButtonProps = UnstyledButtonProps & {
  width?: number;
  size?: "large" | "small";
  onClick?: () => void;
  imageProps?: Omit<ImageProps, "src" | "alt" | "width" | "height">;
};

export const LoginWithEveOnlineButton = memo(
  ({ imageProps, size, ...otherProps }: LoginWithEveOnlineButtonProps) => {
    const { classes } = useStyles();
    const theme = useMantineTheme();

    const url = `https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-${
      theme.colorScheme === "dark" ? "black" : "white"
    }-large.png`;

    const defaultWidth = size === "large" ? 270 : 195;
    const defaultHeight = size === "large" ? 45 : 30;

    const width = otherProps.width ?? defaultWidth;
    const height = (width / defaultWidth) * defaultHeight;

    return (
      <UnstyledButton
        onClick={otherProps.onClick}
        className={classes.user}
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
