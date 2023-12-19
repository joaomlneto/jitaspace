import z from "zod";

export const tokenRefreshDataSchema = z.object({
  accessTokenExpiration: z.number(),
  refreshToken: z.string(),
});
