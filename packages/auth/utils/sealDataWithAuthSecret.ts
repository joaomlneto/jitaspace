import Iron from "@hapi/iron";

import { env } from "../env";

export const sealDataWithAuthSecret = async (data: any) => {
  if (!env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET not set!");
  }

  const result = await Iron.seal(data, env.NEXTAUTH_SECRET, Iron.defaults);
  console.log("SEALED DATA:", { data, result });
  return result;
};
