import Iron from "@hapi/iron";

import { env } from "../env";

export const unsealDataWithAuthSecret = (data: any) => {
  if (!env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET not set!");
  }
  return Iron.unseal(data, env.NEXTAUTH_SECRET, Iron.defaults);
};
