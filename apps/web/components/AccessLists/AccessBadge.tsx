import type { BadgeProps } from "@mantine/core";
import { Badge } from "@mantine/core";

import type { AccessListAccess } from "@jitaspace/hooks";

const ACCESS_COLORS: Record<AccessListAccess, string> = {
  Admin: "grape",
  Manager: "blue",
  Allowed: "green",
  Blocked: "red",
  Unspecified: "gray",
};

/** What an access list grants a member, as a colored badge. */
export function AccessBadge({
  access,
  ...props
}: Readonly<
  Omit<BadgeProps, "children" | "color"> & { access: AccessListAccess }
>) {
  return (
    // Light, not filled: filled badges on the red and green palettes fall
    // under 4.5:1 for their white text.
    <Badge variant="light" color={ACCESS_COLORS[access]} {...props}>
      {access}
    </Badge>
  );
}
