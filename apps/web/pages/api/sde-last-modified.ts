import { type NextApiRequest, type NextApiResponse } from "next";

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
  // get (first page of) assets
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

  return res.json(response);
}
