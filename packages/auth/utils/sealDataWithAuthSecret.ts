import Iron from "@hapi/iron";

import { env } from "../env";

export const sealDataWithAuthSecret = async (data: any) => {
  const result = await Iron.seal(data, env.NEXTAUTH_SECRET, Iron.defaults);
  console.log("SEALED DATA:", { data, result });
  return result;
};
