import { env } from "~/env";

export const CONFIG = {
  SITE_URL: env.NEXT_PUBLIC_SITE_URL ?? "https://www.jita.space",
  TRANQUILITY_DOWNTIME_SECONDS: 900,
};
