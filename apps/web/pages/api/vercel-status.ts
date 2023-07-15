import { type NextApiRequest, type NextApiResponse } from "next";

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { error: string }
    | {
        page: {
          id: string;
          name: string;
          url: string;
          time_zone: string;
          updated_at: string;
        };
        status: {
          indicator: string;
          description: string;
        };
      }
  >,
) {
  const sdeResponse = await fetch(
    `https://www.vercel-status.com/api/v2/status.json`,
  );

  const body = (await sdeResponse.json()) as {
    page: {
      id: string;
      name: string;
      url: string;
      time_zone: string;
      updated_at: string;
    };
    status: {
      indicator: string;
      description: string;
    };
  };

  return res
    .appendHeader("Cache-Control", "public, max-age=300") // 5 minutes
    .json(body);
}
