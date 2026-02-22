import type { NextApiRequest, NextApiResponse } from "next";

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        _key: "sde";
        buildNumber: number;
        releaseDate: string;
      }
  >,
) {
  const response: {
    _key: "sde";
    buildNumber: number;
    releaseDate: string;
  } = await fetch(
    `https://developers.eveonline.com/static-data/tranquility/latest.jsonl`,
  ).then((res) => res.json());


  return res
    .setHeader("Cache-Control", "public, max-age=300") // 5 minutes
    .json(response);
}
