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
  )
    .then((res) => res.json())
    .catch((err) => console.error(err))) as string[];

  if (!response) {
    return res
      .setHeader("Cache-Control", "public, max-age=86400, immutable")
      .status(HttpStatusCode.NotFound)
      .json({
        error: "Image not found",
      });
  }

  /***********************************************************
   * ATTENTION: THIS API IS BEING USED BY CPPC T'AMBER!!!     *
   *            LET HIM KNOW IF THERE ARE BREAKING CHANGES!!! *
   ************************************************************/
  return res
    .setHeader("Cache-Control", "public, max-age=86400, immutable")
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader(
      "Access-Control-Allow-Methods",
      "POST, PUT, DELETE, GET, HEAD, OPTIONS",
    )
    .setHeader("Access-Control-Allow-Headers", "Content-Type")
    .json(response);
}
