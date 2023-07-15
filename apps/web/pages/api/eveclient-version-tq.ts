import { type NextApiRequest, type NextApiResponse } from "next";

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        date: string | null;
        build: string;
        protected: boolean;
        platforms: string[];
      }
  >,
) {
  const sdeResponse = await fetch(
    `https://binaries.eveonline.com/eveclient_TQ.json`,
  );

  const body = (await sdeResponse.json()) as {
    build: string;
    protected: boolean;
    platforms: string[];
  };

  const response = {
    date: sdeResponse.headers.get("date"),
    ...body,
  };

  return res
    .appendHeader("Cache-Control", "public, max-age=300") // 5 minutes
    .json(response);
}
