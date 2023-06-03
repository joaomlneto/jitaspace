import React from "react";
import Image from "next/image";
import {
  UnstyledButton,
  createStyles,
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

type Props = UnstyledButtonProps & {
  width?: number;
  size?: "large" | "small";
  onClick?: () => void;
};

export default function LoginWithEveOnlineButton(props: Props) {
  const { classes } = useStyles();
  const theme = useMantineTheme();

  const url = `https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-${
    theme.colorScheme === "dark" ? "black" : "white"
  }-large.png`;

  const defaultWidth = props.size === "large" ? 270 : 195;
  const defaultHeight = props.size === "large" ? 45 : 30;

  const width = props.width ?? defaultWidth;
  const height = (width / defaultWidth) * defaultHeight;

  return (
    <UnstyledButton onClick={props.onClick} className={classes.user} {...props}>
      <Image
        src={url}
        alt="Login with EVE Online"
        width={width}
        height={height}
      />
    </UnstyledButton>
  );
}
