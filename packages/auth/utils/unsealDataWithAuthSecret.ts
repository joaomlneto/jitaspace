import Iron from "@hapi/iron";

import { env } from "../env";

export const unsealDataWithAuthSecret = (data: any) =>
  Iron.unseal(data, env.NEXTAUTH_SECRET, Iron.defaults);
