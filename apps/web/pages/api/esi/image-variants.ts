import { type NextApiRequest, type NextApiResponse } from "next";
import { HttpStatusCode } from "axios";
import z from "zod";

export default async function NextApiRouteHandler(
  req: NextApiRequest,
  res: NextApiResponse<{ error: string } | string[]>,
) {
  const querySchema = z.object({
    category: z.enum(["alliances", "corporations", "characters", "types"]),
    id: z.string(),
  });

  const query = querySchema.safeParse(req.query);

  if (!query.success) {
    return res.status(HttpStatusCode.BadRequest).json({
      error: "Invalid request",
    });
  }

  const response = (await fetch(
    `https://images.evetech.net/${query.data.category}/${query.data.id}`,
  ).then((res) => res.json())) as string[];

  return res
    .appendHeader("Cache-Control", "public, max-age=86400")
    .appendHeader("Access-Control-Allow-Origin", "*")
    .appendHeader(
      "Access-Control-Allow-Methods",
      "POST, PUT, DELETE, GET, OPTIONS",
    )
    .appendHeader("Access-Control-Request-Method", "*")
    .appendHeader("Access-Control-Allow-Headers", "Content-Type")
    .json(response);
}
