import Iron from "@hapi/iron";

import { env } from "../env";

export const unsealDataWithAuthSecret = ({
  data,
  secret,
}: {
  data: string;
  secret: string;
}) => {
  if (!secret) {
    throw new Error("Secret not set!");
  }
  return Iron.unseal(data, env.NEXTAUTH_SECRET, Iron.defaults);
};
