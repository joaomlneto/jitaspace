import type {NextApiRequest, NextApiResponse} from "next";

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        date: string | null;
        lastModified: string | null;
      }
  >,
) {
  const sdeResponse = await fetch(
    `https://eve-static-data-export.s3-eu-west-1.amazonaws.com/tranquility/sde.zip`,
    {
      method: "HEAD",
    },
  );

  const response = {
    date: sdeResponse.headers.get("date"),
    lastModified: sdeResponse.headers.get("last-modified"),
  };

  return res
    .setHeader("Cache-Control", "public, max-age=300") // 5 minutes
    .json(response);
}
