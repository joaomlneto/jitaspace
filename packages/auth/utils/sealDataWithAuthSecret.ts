import Iron from "@hapi/iron";

export const sealDataWithAuthSecret = async ({
  data,
  secret,
}: {
  data: any;
  secret: string;
}) => {
  if (!secret) {
    throw new Error("Secret not set!");
  }

  const result = await Iron.seal(data, secret, Iron.defaults);
  //console.debug("SEALED DATA:", { data, result });
  return result;
};
